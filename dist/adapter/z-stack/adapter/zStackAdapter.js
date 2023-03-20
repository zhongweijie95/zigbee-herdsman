"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const tstype_1 = require("./tstype");
const Events = __importStar(require("../../events"));
const adapter_1 = __importDefault(require("../../adapter"));
const znp_1 = require("../znp");
const unpi_1 = require("../unpi");
const zcl_1 = require("../../../zcl");
const utils_1 = require("../../../utils");
const Constants = __importStar(require("../constants"));
const debug_1 = __importDefault(require("debug"));
const debounce_1 = __importDefault(require("debounce"));
const manager_1 = require("./manager");
const debug = debug_1.default("zigbee-herdsman:adapter:zStack:adapter");
const Subsystem = unpi_1.Constants.Subsystem;
const Type = unpi_1.Constants.Type;
const { ZnpCommandStatus, AddressMode } = Constants.COMMON;
const DataConfirmTimeout = 9999; // Not an actual code
const DataConfirmErrorCodeLookup = {
    [DataConfirmTimeout]: 'Timeout',
    26: 'MAC no resources',
    183: 'APS no ack',
    205: 'No network route',
    225: 'MAC channel access failure',
    233: 'MAC no ack',
    240: 'MAC transaction expired',
};
class DataConfirmError extends Error {
    constructor(code) {
        const message = `Data request failed with error: '${DataConfirmErrorCodeLookup[code]}' (${code})`;
        super(message);
        this.code = code;
    }
}
class ZStackAdapter extends adapter_1.default {
    constructor(networkOptions, serialPortOptions, backupPath, adapterOptions, logger) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions, logger);
        this.supportsLED = null;
        this.znp = new znp_1.Znp(this.serialPortOptions.path, this.serialPortOptions.baudRate, this.serialPortOptions.rtscts);
        this.transactionID = 0;
        this.deviceAnnounceRouteDiscoveryDebouncers = new Map();
        this.interpanLock = false;
        this.interpanEndpointRegistered = false;
        this.closing = false;
        this.waitress = new utils_1.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
        this.znp.on('received', this.onZnpRecieved.bind(this));
        this.znp.on('close', this.onZnpClose.bind(this));
    }
    /**
     * Adapter methods
     */
    async start() {
        await this.znp.open();
        const attempts = 3;
        for (let i = 0; i < attempts; i++) {
            try {
                await this.znp.request(Subsystem.SYS, 'ping', { capabilities: 1 });
                break;
            }
            catch (e) {
                if (attempts - 1 === i) {
                    throw new Error(`Failed to connect to the adapter (${e})`);
                }
            }
        }
        // Old firmware did not support version, assume it's Z-Stack 1.2 for now.
        try {
            this.version = (await this.znp.request(Subsystem.SYS, 'version', {})).payload;
        }
        catch (e) {
            debug(`Failed to get zStack version, assuming 1.2`);
            this.version = { "transportrev": 2, "product": 0, "majorrel": 2, "minorrel": 0, "maintrel": 0, "revision": "" };
        }
        const concurrent = this.adapterOptions && this.adapterOptions.concurrent ?
            this.adapterOptions.concurrent :
            (this.version.product === tstype_1.ZnpVersion.zStack3x0 ? 16 : 2);
        debug(`Adapter concurrent: ${concurrent}`);
        this.queue = new utils_1.Queue(concurrent);
        debug(`Detected znp version '${tstype_1.ZnpVersion[this.version.product]}' (${JSON.stringify(this.version)})`);
        this.adapterManager = new manager_1.ZnpAdapterManager(this.znp, {
            backupPath: this.backupPath,
            version: this.version.product,
            greenPowerGroup: this.greenPowerGroup,
            networkOptions: this.networkOptions,
            adapterOptions: this.adapterOptions,
        }, this.logger);
        const startResult = this.adapterManager.start();
        if (this.adapterOptions.disableLED) {
            // Wait a bit for adapter to startup, otherwise led doesn't disable (tested with CC2531)
            await utils_1.Wait(200);
            await this.setLED('disable');
        }
        return startResult;
    }
    async stop() {
        this.closing = true;
        await this.znp.close();
    }
    static async isValidPath(path) {
        return znp_1.Znp.isValidPath(path);
    }
    static async autoDetectPath() {
        return znp_1.Znp.autoDetectPath();
    }
    async getCoordinator() {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const activeEpRsp = this.znp.waitFor(unpi_1.Constants.Type.AREQ, Subsystem.ZDO, 'activeEpRsp');
            await this.znp.request(Subsystem.ZDO, 'activeEpReq', { dstaddr: 0, nwkaddrofinterest: 0 }, activeEpRsp.ID);
            const activeEp = await activeEpRsp.start().promise;
            const deviceInfo = await this.znp.request(Subsystem.UTIL, 'getDeviceInfo', {});
            const endpoints = [];
            for (const endpoint of activeEp.payload.activeeplist) {
                const simpleDescRsp = this.znp.waitFor(unpi_1.Constants.Type.AREQ, Subsystem.ZDO, 'simpleDescRsp', { endpoint });
                await this.znp.request(Subsystem.ZDO, 'simpleDescReq', { dstaddr: 0, nwkaddrofinterest: 0, endpoint }, simpleDescRsp.ID);
                const simpleDesc = await simpleDescRsp.start().promise;
                endpoints.push({
                    ID: simpleDesc.payload.endpoint,
                    profileID: simpleDesc.payload.profileid,
                    deviceID: simpleDesc.payload.deviceid,
                    inputClusters: simpleDesc.payload.inclusterlist,
                    outputClusters: simpleDesc.payload.outclusterlist,
                });
            }
            return {
                networkAddress: 0,
                manufacturerID: 0,
                ieeeAddr: deviceInfo.payload.ieeeaddr,
                endpoints,
            };
        });
    }
    async permitJoin(seconds, networkAddress) {
        const addrmode = networkAddress === null ? 0x0F : 0x02;
        const dstaddr = networkAddress || 0xFFFC;
        await this.queue.execute(async () => {
            this.checkInterpanLock();
            const payload = { addrmode, dstaddr, duration: seconds, tcsignificance: 0 };
            await this.znp.request(Subsystem.ZDO, 'mgmtPermitJoinReq', payload);
            await this.setLED(seconds == 0 ? 'off' : 'on');
        });
    }
    async getCoordinatorVersion() {
        return { type: tstype_1.ZnpVersion[this.version.product], meta: this.version };
    }
    async reset(type) {
        if (type === 'soft') {
            await this.znp.request(Subsystem.SYS, 'resetReq', { type: Constants.SYS.resetType.SOFT });
        }
        else {
            await this.znp.request(Subsystem.SYS, 'resetReq', { type: Constants.SYS.resetType.HARD });
        }
    }
    async setLED(action) {
        if (this.supportsLED == null) {
            // Only zStack3x0 with 20210430 and greater support LED
            const zStack3x0 = this.version.product === tstype_1.ZnpVersion.zStack3x0;
            this.supportsLED = !zStack3x0 || (zStack3x0 && parseInt(this.version.revision) >= 20210430);
        }
        if (!this.supportsLED || (this.adapterOptions.disableLED && action !== 'disable')) {
            return;
        }
        // Firmwares build on and after 20211029 should handle LED themselves
        const firmwareControlsLed = parseInt(this.version.revision) >= 20211029;
        const lookup = {
            'disable': firmwareControlsLed ? { ledid: 0xFF, mode: 5 } : { ledid: 3, mode: 0 },
            'on': firmwareControlsLed ? null : { ledid: 3, mode: 1 },
            'off': firmwareControlsLed ? null : { ledid: 3, mode: 0 },
        };
        const payload = lookup[action];
        if (payload) {
            this.znp.request(Subsystem.UTIL, 'ledControl', payload, null, 500).catch(() => {
                // We cannot 100% correctly determine if an adapter supports LED. E.g. the zStack 1.2 20190608
                // fw supports led on the CC2531 but not on the CC2530. Therefore if a led request fails never thrown
                // an error but instead mark the led as unsupported.
                // https://github.com/Koenkk/zigbee-herdsman/issues/377
                // https://github.com/Koenkk/zigbee2mqtt/issues/7693
                this.supportsLED = false;
            });
        }
    }
    async requestNetworkAddress(ieeeAddr) {
        /**
         * NOTE: There are cases where multiple nwkAddrRsp are recevied with different network addresses,
         * this is currently not handled, the first nwkAddrRsp is taken.
         */
        debug("Request network address of '%s'", ieeeAddr);
        const response = this.znp.waitFor(unpi_1.Constants.Type.AREQ, Subsystem.ZDO, 'nwkAddrRsp', { ieeeaddr: ieeeAddr });
        await this.znp.request(Subsystem.ZDO, 'nwkAddrReq', { ieeeaddr: ieeeAddr, reqtype: 0, startindex: 0 });
        const result = await response.start().promise;
        return result.payload.nwkaddr;
    }
    supportsAssocRemove() {
        return this.version.product === tstype_1.ZnpVersion.zStack3x0 && parseInt(this.version.revision) >= 20200805;
    }
    supportsAssocAdd() {
        return this.version.product === tstype_1.ZnpVersion.zStack3x0 && parseInt(this.version.revision) >= 20201026;
    }
    async discoverRoute(networkAddress, wait = true) {
        debug('Discovering route to %d', networkAddress);
        const payload = { dstAddr: networkAddress, options: 0, radius: Constants.AF.DEFAULT_RADIUS };
        await this.znp.request(Subsystem.ZDO, 'extRouteDisc', payload);
        if (wait) {
            await utils_1.Wait(3000);
        }
    }
    async nodeDescriptor(networkAddress) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            try {
                const result = await this.nodeDescriptorInternal(networkAddress);
                return result;
            }
            catch (error) {
                debug(`Node descriptor request for '${networkAddress}' failed (${error}), retry`);
                // Doing a route discovery after simple descriptor request fails makes it succeed sometimes.
                // https://github.com/Koenkk/zigbee2mqtt/issues/3276
                await this.discoverRoute(networkAddress);
                const result = await this.nodeDescriptorInternal(networkAddress);
                return result;
            }
        }, networkAddress);
    }
    async nodeDescriptorInternal(networkAddress) {
        const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'nodeDescRsp', { nwkaddr: networkAddress });
        const payload = { dstaddr: networkAddress, nwkaddrofinterest: networkAddress };
        await this.znp.request(Subsystem.ZDO, 'nodeDescReq', payload, response.ID);
        const descriptor = await response.start().promise;
        let type = 'Unknown';
        const logicalType = descriptor.payload.logicaltype_cmplxdescavai_userdescavai & 0x07;
        for (const [key, value] of Object.entries(Constants.ZDO.deviceLogicalType)) {
            if (value === logicalType) {
                if (key === 'COORDINATOR')
                    type = 'Coordinator';
                else if (key === 'ROUTER')
                    type = 'Router';
                else if (key === 'ENDDEVICE')
                    type = 'EndDevice';
                break;
            }
        }
        return { manufacturerCode: descriptor.payload.manufacturercode, type };
    }
    async activeEndpoints(networkAddress) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'activeEpRsp', { nwkaddr: networkAddress });
            const payload = { dstaddr: networkAddress, nwkaddrofinterest: networkAddress };
            await this.znp.request(Subsystem.ZDO, 'activeEpReq', payload, response.ID);
            const activeEp = await response.start().promise;
            return { endpoints: activeEp.payload.activeeplist };
        }, networkAddress);
    }
    async simpleDescriptor(networkAddress, endpointID) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const responsePayload = { nwkaddr: networkAddress, endpoint: endpointID };
            const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'simpleDescRsp', responsePayload);
            const payload = { dstaddr: networkAddress, nwkaddrofinterest: networkAddress, endpoint: endpointID };
            await this.znp.request(Subsystem.ZDO, 'simpleDescReq', payload, response.ID);
            const descriptor = await response.start().promise;
            return {
                profileID: descriptor.payload.profileid,
                endpointID: descriptor.payload.endpoint,
                deviceID: descriptor.payload.deviceid,
                inputClusters: descriptor.payload.inclusterlist,
                outputClusters: descriptor.payload.outclusterlist,
            };
        }, networkAddress);
    }
    async sendZclFrameToEndpoint(ieeeAddr, networkAddress, endpoint, zclFrame, timeout, disableResponse, disableRecovery, sourceEndpoint) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint || 1, zclFrame, timeout, disableResponse, disableRecovery, 0, 0, false, false, false, null);
        }, networkAddress);
    }
    async sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt, dataRequestAttempt, checkedNetworkAddress, discoveredRoute, assocRemove, assocRestore) {
        debug('sendZclFrameToEndpointInternal %s:%i/%i (%i,%i,%i)', ieeeAddr, networkAddress, endpoint, responseAttempt, dataRequestAttempt, this.queue.count());
        let response = null;
        const command = zclFrame.getCommand();
        if (command.hasOwnProperty('response') && disableResponse === false) {
            response = this.waitForInternal(networkAddress, endpoint, zclFrame.Header.frameControl.frameType, zcl_1.Direction.SERVER_TO_CLIENT, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, command.response, timeout);
        }
        else if (!zclFrame.Header.frameControl.disableDefaultResponse) {
            response = this.waitForInternal(networkAddress, endpoint, zcl_1.FrameType.GLOBAL, zcl_1.Direction.SERVER_TO_CLIENT, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, zcl_1.Foundation.defaultRsp.ID, timeout);
        }
        const dataConfirmResult = await this.dataRequest(networkAddress, endpoint, sourceEndpoint, zclFrame.Cluster.ID, Constants.AF.DEFAULT_RADIUS, zclFrame.toBuffer(), timeout);
        if (dataConfirmResult !== ZnpCommandStatus.SUCCESS) {
            // In case dataConfirm timesout (= null) or gives an error, try to recover
            debug('Data confirm error (%s:%d,%d,%d)', ieeeAddr, networkAddress, dataConfirmResult, dataRequestAttempt);
            if (response !== null)
                response.cancel();
            /**
             * In case we did an assocRemove in the previous attempt and it still fails after this, assume that the
             * coordinator is still the parent of the device (but for some reason the device is not available now).
             * Re-add the device to the assoc table, otherwise we will never be able to reach it anymore.
             */
            if (assocRemove && assocRestore && this.supportsAssocAdd()) {
                debug('assocAdd(%s)', assocRestore.ieeeadr);
                await this.znp.request(Subsystem.UTIL, 'assocAdd', assocRestore);
                assocRestore = null;
            }
            const recoverableErrors = [
                ZnpCommandStatus.NWK_NO_ROUTE, ZnpCommandStatus.MAC_NO_ACK, ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE,
                ZnpCommandStatus.MAC_TRANSACTION_EXPIRED, ZnpCommandStatus.BUFFER_FULL,
                ZnpCommandStatus.MAC_NO_RESOURCES,
            ];
            if (dataRequestAttempt >= 4 || !recoverableErrors.includes(dataConfirmResult) || disableRecovery) {
                throw new DataConfirmError(dataConfirmResult);
            }
            if (dataConfirmResult === ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE ||
                dataConfirmResult === ZnpCommandStatus.BUFFER_FULL ||
                dataConfirmResult === ZnpCommandStatus.MAC_NO_RESOURCES) {
                /**
                 * MAC_CHANNEL_ACCESS_FAILURE: When many commands at once are executed we can end up in a MAC
                 * channel access failure error. This is because there is too much traffic on the network.
                 * Retry this command once after a cooling down period.
                 * BUFFER_FULL: When many commands are executed at once the buffer can get full, wait
                 * some time and retry.
                 * MAC_NO_RESOURCES: Operation could not be completed because no memory resources are available,
                 * wait some time and retry.
                 */
                await utils_1.Wait(2000);
                return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt, dataRequestAttempt + 1, checkedNetworkAddress, discoveredRoute, assocRemove, assocRestore);
            }
            else {
                let doAssocRemove = false;
                if (!assocRemove && dataConfirmResult === ZnpCommandStatus.MAC_TRANSACTION_EXPIRED &&
                    dataRequestAttempt >= 1 && this.supportsAssocRemove()) {
                    const match = await this.znp.request(Subsystem.UTIL, 'assocGetWithAddress', { extaddr: ieeeAddr, nwkaddr: networkAddress });
                    if (match.payload.noderelation !== 255) {
                        doAssocRemove = true;
                        assocRestore =
                            { ieeeadr: ieeeAddr, nwkaddr: networkAddress, noderelation: match.payload.noderelation };
                    }
                    assocRemove = true;
                }
                // NWK_NO_ROUTE: no network route => rediscover route
                // MAC_NO_ACK: route may be corrupted
                // MAC_TRANSACTION_EXPIRED: Mac layer is sleeping
                if (doAssocRemove) {
                    /**
                     * Since child aging is disabled on the firmware, when a end device is directly connected
                     * to the coordinator and changes parent and the coordinator does not recevie this update,
                     * it still thinks it's directly connected.
                     * A discoverRoute() is not send out in this case, therefore remove it from the associated device
                     * list and try again.
                     * Note: assocRemove is a custom command, not available by default, only available on recent
                     * z-stack-firmware firmware version. In case it's not supported by the coordinator we will
                     * automatically timeout after 60000ms.
                     */
                    debug('assocRemove(%s)', ieeeAddr);
                    await this.znp.request(Subsystem.UTIL, 'assocRemove', { ieeeadr: ieeeAddr });
                }
                else if (!discoveredRoute && dataRequestAttempt >= 1) {
                    discoveredRoute = true;
                    await this.discoverRoute(networkAddress);
                }
                else if (!checkedNetworkAddress && dataRequestAttempt >= 1) {
                    // Figure out once if the network address has been changed.
                    try {
                        checkedNetworkAddress = true;
                        const actualNetworkAddress = await this.requestNetworkAddress(ieeeAddr);
                        if (networkAddress !== actualNetworkAddress) {
                            debug(`Failed because request was done with wrong network address`);
                            discoveredRoute = true;
                            networkAddress = actualNetworkAddress;
                            await this.discoverRoute(actualNetworkAddress);
                        }
                        else {
                            debug('Network address did not change');
                        }
                    }
                    catch (_a) { }
                }
                else {
                    debug('Wait 2000ms');
                    await utils_1.Wait(2000);
                }
                return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt, dataRequestAttempt + 1, checkedNetworkAddress, discoveredRoute, assocRemove, assocRestore);
            }
        }
        if (response !== null) {
            try {
                const result = await response.start().promise;
                return result;
            }
            catch (error) {
                debug('Response timeout (%s:%d,%d)', ieeeAddr, networkAddress, responseAttempt);
                if (responseAttempt < 1 && !disableRecovery) {
                    // No response could be of invalid route, e.g. when message is send to wrong parent of end device.
                    await this.discoverRoute(networkAddress);
                    return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt + 1, dataRequestAttempt, checkedNetworkAddress, discoveredRoute, assocRemove, assocRestore);
                }
                else {
                    throw error;
                }
            }
        }
        else {
            return null;
        }
    }
    async sendZclFrameToGroup(groupID, zclFrame, sourceEndpoint) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            await this.dataRequestExtended(AddressMode.ADDR_GROUP, groupID, 0xFF, 0, sourceEndpoint || 1, zclFrame.Cluster.ID, Constants.AF.DEFAULT_RADIUS, zclFrame.toBuffer(), 3000, true);
            /**
             * As a group command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await utils_1.Wait(200);
        });
    }
    async sendZclFrameToAll(endpoint, zclFrame, sourceEndpoint) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            await this.dataRequestExtended(AddressMode.ADDR_16BIT, 0xFFFD, endpoint, 0, sourceEndpoint, zclFrame.Cluster.ID, Constants.AF.DEFAULT_RADIUS, zclFrame.toBuffer(), 3000, false, 0);
            /**
             * As a broadcast command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await utils_1.Wait(200);
        });
    }
    async lqi(networkAddress) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const neighbors = [];
            // eslint-disable-next-line
            const request = async (startIndex) => {
                const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'mgmtLqiRsp', { srcaddr: networkAddress });
                await this.znp.request(Subsystem.ZDO, 'mgmtLqiReq', { dstaddr: networkAddress, startindex: startIndex }, response.ID);
                const result = await response.start().promise;
                if (result.payload.status !== ZnpCommandStatus.SUCCESS) {
                    throw new Error(`LQI for '${networkAddress}' failed`);
                }
                return result;
            };
            // eslint-disable-next-line
            const add = (list) => {
                for (const entry of list) {
                    neighbors.push({
                        linkquality: entry.lqi,
                        networkAddress: entry.nwkAddr,
                        ieeeAddr: entry.extAddr,
                        relationship: entry.relationship,
                        depth: entry.depth,
                    });
                }
            };
            let response = await request(0);
            add(response.payload.neighborlqilist);
            const size = response.payload.neighbortableentries;
            let nextStartIndex = response.payload.neighborlqilist.length;
            while (neighbors.length < size) {
                response = await request(nextStartIndex);
                add(response.payload.neighborlqilist);
                nextStartIndex += response.payload.neighborlqilist.length;
            }
            return { neighbors };
        }, networkAddress);
    }
    async routingTable(networkAddress) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const table = [];
            // eslint-disable-next-line
            const request = async (startIndex) => {
                const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'mgmtRtgRsp', { srcaddr: networkAddress });
                await this.znp.request(Subsystem.ZDO, 'mgmtRtgReq', { dstaddr: networkAddress, startindex: startIndex }, response.ID);
                const result = await response.start().promise;
                if (result.payload.status !== ZnpCommandStatus.SUCCESS) {
                    throw new Error(`Routing table for '${networkAddress}' failed`);
                }
                return result;
            };
            // eslint-disable-next-line
            const add = (list) => {
                for (const entry of list) {
                    table.push({
                        destinationAddress: entry.destNwkAddr,
                        status: entry.routeStatus,
                        nextHop: entry.nextHopNwkAddr,
                    });
                }
            };
            let response = await request(0);
            add(response.payload.routingtablelist);
            const size = response.payload.routingtableentries;
            let nextStartIndex = response.payload.routingtablelist.length;
            while (table.length < size) {
                response = await request(nextStartIndex);
                add(response.payload.routingtablelist);
                nextStartIndex += response.payload.routingtablelist.length;
            }
            return { table };
        }, networkAddress);
    }
    async bind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const responsePayload = { srcaddr: destinationNetworkAddress };
            const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'bindRsp', responsePayload);
            const payload = {
                dstaddr: destinationNetworkAddress,
                srcaddr: sourceIeeeAddress,
                srcendpoint: sourceEndpoint,
                clusterid: clusterID,
                dstaddrmode: type === 'group' ?
                    AddressMode.ADDR_GROUP : AddressMode.ADDR_64BIT,
                dstaddress: this.toAddressString(destinationAddressOrGroup),
                dstendpoint: type === 'group' ? 0xFF : destinationEndpoint,
            };
            await this.znp.request(Subsystem.ZDO, 'bindReq', payload, response.ID);
            await response.start().promise;
        }, destinationNetworkAddress);
    }
    async unbind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const response = this.znp.waitFor(Type.AREQ, Subsystem.ZDO, 'unbindRsp', { srcaddr: destinationNetworkAddress });
            const payload = {
                dstaddr: destinationNetworkAddress,
                srcaddr: sourceIeeeAddress,
                srcendpoint: sourceEndpoint,
                clusterid: clusterID,
                dstaddrmode: type === 'group' ?
                    AddressMode.ADDR_GROUP : AddressMode.ADDR_64BIT,
                dstaddress: this.toAddressString(destinationAddressOrGroup),
                dstendpoint: type === 'group' ? 0xFF : destinationEndpoint,
            };
            await this.znp.request(Subsystem.ZDO, 'unbindReq', payload, response.ID);
            await response.start().promise;
        }, destinationNetworkAddress);
    }
    removeDevice(networkAddress, ieeeAddr) {
        return this.queue.execute(async () => {
            this.checkInterpanLock();
            const response = this.znp.waitFor(unpi_1.Constants.Type.AREQ, Subsystem.ZDO, 'mgmtLeaveRsp', { srcaddr: networkAddress });
            const payload = {
                dstaddr: networkAddress,
                deviceaddress: ieeeAddr,
                removechildrenRejoin: 0,
            };
            await this.znp.request(Subsystem.ZDO, 'mgmtLeaveReq', payload, response.ID);
            await response.start().promise;
        }, networkAddress);
    }
    /**
     * Event handlers
     */
    onZnpClose() {
        if (!this.closing) {
            this.emit(Events.Events.disconnected);
        }
    }
    onZnpRecieved(object) {
        if (object.type !== unpi_1.Constants.Type.AREQ) {
            return;
        }
        if (object.subsystem === Subsystem.ZDO) {
            if (object.command === 'tcDeviceInd') {
                const payload = {
                    networkAddress: object.payload.nwkaddr,
                    ieeeAddr: object.payload.extaddr,
                };
                this.emit(Events.Events.deviceJoined, payload);
            }
            else if (object.command === 'endDeviceAnnceInd') {
                const payload = {
                    networkAddress: object.payload.nwkaddr,
                    ieeeAddr: object.payload.ieeeaddr,
                };
                // Only discover routes to end devices, if bit 1 of capabilities === 0 it's an end device.
                const isEndDevice = (object.payload.capabilities & 1 << 1) === 0;
                if (isEndDevice) {
                    if (!this.deviceAnnounceRouteDiscoveryDebouncers.has(payload.networkAddress)) {
                        // If a device announces multiple times in a very short time, it makes no sense
                        // to rediscover the route every time.
                        const debouncer = debounce_1.default(() => {
                            this.queue.execute(async () => {
                                await this.discoverRoute(payload.networkAddress, false);
                            }, payload.networkAddress);
                        }, 60 * 1000, true);
                        this.deviceAnnounceRouteDiscoveryDebouncers.set(payload.networkAddress, debouncer);
                    }
                    this.deviceAnnounceRouteDiscoveryDebouncers.get(payload.networkAddress)();
                }
                this.emit(Events.Events.deviceAnnounce, payload);
            }
            else if (object.command === 'nwkAddrRsp') {
                const payload = {
                    networkAddress: object.payload.nwkaddr,
                    ieeeAddr: object.payload.ieeeaddr,
                };
                this.emit(Events.Events.networkAddress, payload);
            }
            else {
                /* istanbul ignore else */
                if (object.command === 'leaveInd') {
                    const payload = {
                        networkAddress: object.payload.srcaddr,
                        ieeeAddr: object.payload.extaddr,
                    };
                    this.emit(Events.Events.deviceLeave, payload);
                }
            }
        }
        else {
            /* istanbul ignore else */
            if (object.subsystem === Subsystem.AF) {
                /* istanbul ignore else */
                if (object.command === 'incomingMsg' || object.command === 'incomingMsgExt') {
                    try {
                        const payload = {
                            frame: zcl_1.ZclFrame.fromBuffer(object.payload.clusterid, object.payload.data),
                            address: object.payload.srcaddr,
                            endpoint: object.payload.srcendpoint,
                            linkquality: object.payload.linkquality,
                            groupID: object.payload.groupid,
                            wasBroadcast: object.payload.wasbroadcast === 1,
                            destinationEndpoint: object.payload.dstendpoint,
                        };
                        this.waitress.resolve(payload);
                        this.emit(Events.Events.zclData, payload);
                    }
                    catch (error) {
                        const payload = {
                            clusterID: object.payload.clusterid,
                            data: object.payload.data,
                            address: object.payload.srcaddr,
                            endpoint: object.payload.srcendpoint,
                            linkquality: object.payload.linkquality,
                            groupID: object.payload.groupid,
                            wasBroadcast: object.payload.wasbroadcast === 1,
                            destinationEndpoint: object.payload.dstendpoint,
                        };
                        this.emit(Events.Events.rawData, payload);
                    }
                }
            }
        }
    }
    async getNetworkParameters() {
        const result = await this.znp.request(Subsystem.ZDO, 'extNwkInfo', {});
        return {
            panID: result.payload.panid, extendedPanID: result.payload.extendedpanid,
            channel: result.payload.channel
        };
    }
    async supportsBackup() {
        return true;
    }
    async backup() {
        return this.adapterManager.backup.createBackup();
    }
    async setChannelInterPAN(channel) {
        return this.queue.execute(async () => {
            this.interpanLock = true;
            await this.znp.request(Subsystem.AF, 'interPanCtl', { cmd: 1, data: [channel] });
            if (!this.interpanEndpointRegistered) {
                // Make sure that endpoint 12 is registered to proxy the InterPAN messages.
                await this.znp.request(Subsystem.AF, 'interPanCtl', { cmd: 2, data: [12] });
                this.interpanEndpointRegistered = true;
            }
        });
    }
    async sendZclFrameInterPANToIeeeAddr(zclFrame, ieeeAddr) {
        return this.queue.execute(async () => {
            await this.dataRequestExtended(AddressMode.ADDR_64BIT, ieeeAddr, 0xFE, 0xFFFF, 12, zclFrame.Cluster.ID, 30, zclFrame.toBuffer(), 10000, false);
        });
    }
    async sendZclFrameInterPANBroadcast(zclFrame, timeout) {
        return this.queue.execute(async () => {
            const command = zclFrame.getCommand();
            if (!command.hasOwnProperty('response')) {
                throw new Error(`Command '${command.name}' has no response, cannot wait for response`);
            }
            const response = this.waitForInternal(null, 0xFE, zclFrame.Header.frameControl.frameType, zcl_1.Direction.SERVER_TO_CLIENT, null, zclFrame.Cluster.ID, command.response, timeout);
            try {
                await this.dataRequestExtended(AddressMode.ADDR_16BIT, 0xFFFF, 0xFE, 0xFFFF, 12, zclFrame.Cluster.ID, 30, zclFrame.toBuffer(), 10000, false);
            }
            catch (error) {
                response.cancel();
                throw error;
            }
            return response.start().promise;
        });
    }
    async restoreChannelInterPAN() {
        return this.queue.execute(async () => {
            await this.znp.request(Subsystem.AF, 'interPanCtl', { cmd: 0, data: [] });
            // Give adapter some time to restore, otherwise stuff crashes
            await utils_1.Wait(3000);
            this.interpanLock = false;
        });
    }
    async setTransmitPower(value) {
        return this.queue.execute(async () => {
            await this.znp.request(Subsystem.SYS, 'stackTune', { operation: 0, value });
        });
    }
    waitForInternal(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        const payload = {
            address: networkAddress, endpoint, clusterID, commandIdentifier, frameType, direction,
            transactionSequenceNumber,
        };
        const waiter = this.waitress.waitFor(payload, timeout);
        const cancel = () => this.waitress.remove(waiter.ID);
        return { start: waiter.start, cancel };
    }
    waitFor(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        const waiter = this.waitForInternal(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout);
        return { cancel: waiter.cancel, promise: waiter.start().promise };
    }
    /**
     * Private methods
     */
    async dataRequest(destinationAddress, destinationEndpoint, sourceEndpoint, clusterID, radius, data, timeout) {
        const transactionID = this.nextTransactionID();
        const response = this.znp.waitFor(Type.AREQ, Subsystem.AF, 'dataConfirm', { transid: transactionID }, timeout);
        await this.znp.request(Subsystem.AF, 'dataRequest', {
            dstaddr: destinationAddress,
            destendpoint: destinationEndpoint,
            srcendpoint: sourceEndpoint,
            clusterid: clusterID,
            transid: transactionID,
            options: 0,
            radius: radius,
            len: data.length,
            data: data,
        }, response.ID);
        let result = null;
        try {
            const dataConfirm = await response.start().promise;
            result = dataConfirm.payload.status;
        }
        catch (_a) {
            result = DataConfirmTimeout;
        }
        return result;
    }
    async dataRequestExtended(addressMode, destinationAddressOrGroupID, destinationEndpoint, panID, sourceEndpoint, clusterID, radius, data, timeout, confirmation, attemptsLeft = 5) {
        const transactionID = this.nextTransactionID();
        const response = confirmation ?
            this.znp.waitFor(Type.AREQ, Subsystem.AF, 'dataConfirm', { transid: transactionID }, timeout) : null;
        await this.znp.request(Subsystem.AF, 'dataRequestExt', {
            dstaddrmode: addressMode,
            dstaddr: this.toAddressString(destinationAddressOrGroupID),
            destendpoint: destinationEndpoint,
            dstpanid: panID,
            srcendpoint: sourceEndpoint,
            clusterid: clusterID,
            transid: transactionID,
            options: 0,
            radius,
            len: data.length,
            data: data,
        }, response ? response.ID : null);
        if (confirmation) {
            const dataConfirm = await response.start().promise;
            if (dataConfirm.payload.status !== ZnpCommandStatus.SUCCESS) {
                if (attemptsLeft > 0 &&
                    (dataConfirm.payload.status === ZnpCommandStatus.MAC_CHANNEL_ACCESS_FAILURE ||
                        dataConfirm.payload.status === ZnpCommandStatus.BUFFER_FULL)) {
                    /**
                     * 225: When many commands at once are executed we can end up in a MAC channel access failure
                     * error. This is because there is too much traffic on the network.
                     * Retry this command once after a cooling down period.
                     */
                    await utils_1.Wait(2000);
                    return this.dataRequestExtended(addressMode, destinationAddressOrGroupID, destinationEndpoint, panID, sourceEndpoint, clusterID, radius, data, timeout, confirmation, attemptsLeft - 1);
                }
                else {
                    throw new DataConfirmError(dataConfirm.payload.status);
                }
            }
            return dataConfirm;
        }
    }
    nextTransactionID() {
        this.transactionID++;
        if (this.transactionID > 255) {
            this.transactionID = 1;
        }
        return this.transactionID;
    }
    toAddressString(address) {
        if (typeof address === 'number') {
            let addressString = address.toString(16);
            for (let i = addressString.length; i < 16; i++) {
                addressString = '0' + addressString;
            }
            return `0x${addressString}`;
        }
        else {
            return address.toString();
        }
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `Timeout - ${matcher.address} - ${matcher.endpoint}` +
            ` - ${matcher.transactionSequenceNumber} - ${matcher.clusterID}` +
            ` - ${matcher.commandIdentifier} after ${timeout}ms`;
    }
    waitressValidator(payload, matcher) {
        const transactionSequenceNumber = payload.frame.Header.transactionSequenceNumber;
        return (!matcher.address || payload.address === matcher.address) &&
            payload.endpoint === matcher.endpoint &&
            (!matcher.transactionSequenceNumber || transactionSequenceNumber === matcher.transactionSequenceNumber) &&
            payload.frame.Cluster.ID === matcher.clusterID &&
            matcher.frameType === payload.frame.Header.frameControl.frameType &&
            matcher.commandIdentifier === payload.frame.Header.commandIdentifier &&
            matcher.direction === payload.frame.Header.frameControl.direction;
    }
    checkInterpanLock() {
        if (this.interpanLock) {
            throw new Error(`Cannot execute command, in Inter-PAN mode`);
        }
    }
}
exports.default = ZStackAdapter;
//# sourceMappingURL=zStackAdapter.js.map