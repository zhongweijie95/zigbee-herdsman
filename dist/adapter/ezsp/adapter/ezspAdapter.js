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
const debug_1 = __importDefault(require("debug"));
const adapter_1 = __importDefault(require("../../adapter"));
const debug = debug_1.default("zigbee-herdsman:adapter:ezsp");
const driver_1 = require("../driver");
const types_1 = require("../driver/types");
const zcl_1 = require("../../../zcl");
const Events = __importStar(require("../../events"));
const utils_1 = require("../../../utils");
class EZSPAdapter extends adapter_1.default {
    constructor(networkOptions, serialPortOptions, backupPath, adapterOptions) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions);
        this.port = serialPortOptions;
        this.waitress = new utils_1.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
        this.interpanLock = false;
        this.driver = new driver_1.Driver();
        this.driver.on('deviceJoined', this.handleDeviceJoin.bind(this));
        this.driver.on('deviceLeft', this.handleDeviceLeft.bind(this));
        this.driver.on('incomingMessage', this.processMessage.bind(this));
    }
    async processMessage(frame) {
        // todo
        debug(`processMessage: ${JSON.stringify(frame)}`);
        if (frame.apsFrame.profileId == 0) {
            if (frame.apsFrame.clusterId == types_1.EmberZDOCmd.Device_annce &&
                frame.apsFrame.destinationEndpoint == 0) {
                let nwk, rst, ieee;
                [nwk, rst] = types_1.uint16_t.deserialize(types_1.uint16_t, frame.message.slice(1));
                [ieee, rst] = types_1.EmberEUI64.deserialize(types_1.EmberEUI64, rst);
                ieee = new types_1.EmberEUI64(ieee);
                debug("ZDO Device announce: %s, %s", nwk, ieee.toString());
                this.handleDeviceJoin([nwk, ieee]);
            }
        }
        else if (frame.apsFrame.profileId == 260 || frame.apsFrame.profileId == 0xFFFF) {
            try {
                const payload = {
                    frame: zcl_1.ZclFrame.fromBuffer(frame.apsFrame.clusterId, frame.message),
                    address: frame.sender,
                    endpoint: frame.apsFrame.sourceEndpoint,
                    linkquality: frame.lqi,
                    groupID: frame.apsFrame.groupId,
                    wasBroadcast: false,
                    destinationEndpoint: frame.apsFrame.destinationEndpoint,
                };
                this.waitress.resolve(payload);
                this.emit(Events.Events.zclData, payload);
            }
            catch (error) {
                const payload = {
                    clusterID: frame.apsFrame.clusterId,
                    data: frame.message,
                    address: frame.sender,
                    endpoint: frame.apsFrame.sourceEndpoint,
                    linkquality: frame.lqi,
                    groupID: frame.apsFrame.groupId,
                    wasBroadcast: false,
                    destinationEndpoint: frame.apsFrame.destinationEndpoint,
                };
                this.emit(Events.Events.rawData, payload);
            }
        }
        this.emit('event', frame);
    }
    async handleDeviceJoin(arr) {
        // todo
        let [nwk, ieee] = arr;
        debug('Device join request received: %s %s', nwk, ieee.toString('hex'));
        const payload = {
            networkAddress: nwk,
            ieeeAddr: `0x${ieee.toString('hex')}`,
        };
        if (nwk == 0) {
            const nd = await this.nodeDescriptor(nwk);
        }
        else {
            this.emit(Events.Events.deviceJoined, payload);
        }
    }
    handleDeviceLeft(arr) {
        // todo
        let [nwk, ieee] = arr;
        debug('Device left network request received: %s %s', nwk, ieee);
        const payload = {
            networkAddress: nwk,
            ieeeAddr: `0x${ieee.toString('hex')}`,
        };
        this.emit(Events.Events.deviceLeave, payload);
    }
    /**
     * Adapter methods
     */
    async start() {
        await this.driver.startup(this.port.path, {
            baudRate: this.port.baudRate || 115200,
            rtscts: this.port.rtscts,
            parity: 'none',
            stopBits: 1,
            xon: true,
            xoff: true
        }, this.networkOptions, this.greenPowerGroup);
        return Promise.resolve("resumed");
    }
    async stop() {
        await this.driver.stop();
    }
    static async isValidPath(path) {
        // todo
        return false;
    }
    static async autoDetectPath() {
        // todo
        return '';
    }
    async getCoordinator() {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const networkAddress = 0x0000;
            const message = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Active_EP_req, types_1.EmberZDOCmd.Active_EP_rsp, networkAddress);
            const activeEndpoints = [...message[3]];
            const endpoints = [];
            for (const endpoint of activeEndpoints) {
                const descriptor = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Simple_Desc_req, types_1.EmberZDOCmd.Simple_Desc_rsp, networkAddress, endpoint);
                endpoints.push({
                    profileID: descriptor[4].profileid,
                    ID: descriptor[4].endpoint,
                    deviceID: descriptor[4].deviceid,
                    inputClusters: descriptor[4].inclusterlist,
                    outputClusters: descriptor[4].outclusterlist,
                });
            }
            return {
                networkAddress: networkAddress,
                manufacturerID: 0,
                ieeeAddr: `0x${this.driver.ieee.toString()}`,
                endpoints,
            };
        });
    }
    async permitJoin(seconds, networkAddress) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            await this.driver.permitJoining(seconds);
        });
    }
    async getCoordinatorVersion() {
        // todo
        return { type: `EZSP v${this.driver.version.product}`, meta: this.driver.version };
    }
    async reset(type) {
        return Promise.reject();
    }
    async lqi(networkAddress) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const neighbors = [];
            const request = async (startIndex) => {
                const result = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Mgmt_Lqi_req, types_1.EmberZDOCmd.Mgmt_Lqi_rsp, startIndex);
                if (result[1] !== types_1.EmberStatus.SUCCESS) {
                    throw new Error(`LQI for '${networkAddress}' failed`);
                }
                return result;
            };
            // eslint-disable-next-line
            const add = (list) => {
                for (const entry of list) {
                    this.driver.setNode(entry.nodeid, entry.ieee);
                    neighbors.push({
                        linkquality: entry.lqi,
                        networkAddress: entry.nodeid,
                        ieeeAddr: `0x${new types_1.EmberEUI64(entry.ieee).toString()}`,
                        relationship: (entry.packed >> 4) & 0x7,
                        depth: entry.depth,
                    });
                }
            };
            let response = await request(0);
            add(response[2].neighbors);
            const size = response[2].entries;
            let nextStartIndex = response[2].neighbors.length;
            while (neighbors.length < size) {
                response = await request(nextStartIndex);
                add(response[2].neighbors);
                nextStartIndex += response[2].neighbors.length;
            }
            return { neighbors };
        }, networkAddress);
    }
    async routingTable(networkAddress) {
        // todo
        return Promise.reject();
    }
    async nodeDescriptor(networkAddress) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            try {
                debug(`Requesting 'Node Descriptor' for '${networkAddress}'`);
                const result = await this.nodeDescriptorInternal(networkAddress);
                return result;
            }
            catch (error) {
                debug(`Node descriptor request for '${networkAddress}' failed (${error}), retry`);
                throw error;
            }
        });
    }
    async nodeDescriptorInternal(networkAddress) {
        const descriptor = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Node_Desc_req, types_1.EmberZDOCmd.Node_Desc_rsp, networkAddress);
        const logicaltype = descriptor[3].byte1 & 0x07;
        return {
            manufacturerCode: descriptor[3].manufacturer_code,
            type: (logicaltype == 0) ? 'Coordinator' : (logicaltype == 1) ? 'Router' : 'EndDevice'
        };
    }
    async activeEndpoints(networkAddress) {
        debug(`Requesting 'Active endpoints' for '${networkAddress}'`);
        return this.driver.queue.execute(async () => {
            const endpoints = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Active_EP_req, types_1.EmberZDOCmd.Active_EP_rsp, networkAddress);
            return { endpoints: [...endpoints[3]] };
        }, networkAddress);
    }
    async simpleDescriptor(networkAddress, endpointID) {
        debug(`Requesting 'Simple Descriptor' for '${networkAddress}' endpoint ${endpointID}`);
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const descriptor = await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Simple_Desc_req, types_1.EmberZDOCmd.Simple_Desc_rsp, networkAddress, endpointID);
            return {
                profileID: descriptor[4].profileid,
                endpointID: descriptor[4].endpoint,
                deviceID: descriptor[4].deviceid,
                inputClusters: descriptor[4].inclusterlist,
                outputClusters: descriptor[4].outclusterlist,
            };
        }, networkAddress);
    }
    async sendZclFrameToEndpoint(ieeeAddr, networkAddress, endpoint, zclFrame, timeout, disableResponse, disableRecovery, sourceEndpoint) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint || 1, zclFrame, timeout, disableResponse, disableRecovery, 0, 0, false, false, false, null);
        }, networkAddress);
    }
    async sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt, dataRequestAttempt, checkedNetworkAddress, discoveredRoute, assocRemove, assocRestore) {
        debug('sendZclFrameToEndpointInternal %s:%i/%i (%i,%i,%i)', ieeeAddr, networkAddress, endpoint, responseAttempt, dataRequestAttempt, this.driver.queue.count());
        let response = null;
        const command = zclFrame.getCommand();
        if (command.hasOwnProperty('response') && disableResponse === false) {
            response = this.waitForInternal(networkAddress, endpoint, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, command.response, timeout);
        }
        else if (!zclFrame.Header.frameControl.disableDefaultResponse) {
            response = this.waitForInternal(networkAddress, endpoint, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, zcl_1.Foundation.defaultRsp.ID, timeout);
        }
        const frame = this.driver.makeApsFrame(zclFrame.Cluster.ID);
        frame.profileId = 0x0104;
        frame.sourceEndpoint = sourceEndpoint || 0x01;
        frame.destinationEndpoint = endpoint;
        frame.groupId = 0;
        frame.options = types_1.EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY | types_1.EmberApsOption.APS_OPTION_RETRY;
        const dataConfirmResult = await this.driver.request(networkAddress, frame, zclFrame.toBuffer());
        if (!dataConfirmResult) {
            if (response != null) {
                response.cancel();
            }
            throw Error('sendZclFrameToEndpointInternal error');
        }
        if (response !== null) {
            try {
                const result = await response.start().promise;
                return result;
            }
            catch (error) {
                debug('Response timeout (%s:%d,%d)', ieeeAddr, networkAddress, responseAttempt);
                if (responseAttempt < 1 && !disableRecovery) {
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
    async sendZclFrameToGroup(groupID, zclFrame) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const frame = this.driver.makeApsFrame(zclFrame.Cluster.ID);
            frame.profileId = 0x0104;
            frame.sourceEndpoint = 0x01;
            frame.destinationEndpoint = 0x01;
            frame.groupId = groupID;
            frame.options = types_1.EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY | types_1.EmberApsOption.APS_OPTION_RETRY;
            const dataConfirmResult = await this.driver.mrequest(frame, zclFrame.toBuffer());
            /**
             * As a group command is not confirmed and thus immidiately returns
             * (contrary to network address requests) we will give the
             * command some time to 'settle' in the network.
             */
            await utils_1.Wait(200);
        });
    }
    async sendZclFrameToAll(endpoint, zclFrame, sourceEndpoint) {
        // todo
        return Promise.resolve();
    }
    async bind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const ieee = new types_1.EmberEUI64(sourceIeeeAddress);
            const addrmode = (type === 'group') ? 1 : 3;
            const ieeeDst = (type === 'group') ? destinationAddressOrGroup :
                new types_1.EmberEUI64(destinationAddressOrGroup);
            await this.driver.zdoRequest(destinationNetworkAddress, types_1.EmberZDOCmd.Bind_req, types_1.EmberZDOCmd.Bind_rsp, ieee, sourceEndpoint, clusterID, { addrmode: addrmode, ieee: ieeeDst, endpoint: destinationEndpoint });
        }, destinationNetworkAddress);
    }
    async unbind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const ieee = new types_1.EmberEUI64(sourceIeeeAddress);
            const addrmode = (type === 'group') ? 1 : 3;
            const ieeeDst = (type === 'group') ? destinationAddressOrGroup :
                new types_1.EmberEUI64(destinationAddressOrGroup);
            await this.driver.zdoRequest(destinationNetworkAddress, types_1.EmberZDOCmd.Unbind_req, types_1.EmberZDOCmd.Unbind_rsp, ieee, sourceEndpoint, clusterID, { addrmode: addrmode, ieee: ieeeDst, endpoint: destinationEndpoint });
        }, destinationNetworkAddress);
    }
    removeDevice(networkAddress, ieeeAddr) {
        return this.driver.queue.execute(async () => {
            this.checkInterpanLock();
            const ieee = new types_1.EmberEUI64(ieeeAddr);
            await this.driver.zdoRequest(networkAddress, types_1.EmberZDOCmd.Mgmt_Leave_req, types_1.EmberZDOCmd.Mgmt_Leave_rsp, ieee, 0x00);
        }, networkAddress);
    }
    async getNetworkParameters() {
        return {
            panID: this.driver.networkParams.panId,
            extendedPanID: this.driver.networkParams.extendedPanId[0],
            channel: this.driver.networkParams.radioChannel
        };
    }
    async supportsBackup() {
        //todo
        return false;
    }
    async backup() {
        throw new Error("This adapter does not support backup");
    }
    async restoreChannelInterPAN() {
        return this.driver.queue.execute(async () => {
            const channel = (await this.getNetworkParameters()).channel;
            await this.driver.setChannel(channel);
            // Give adapter some time to restore, otherwise stuff crashes
            await utils_1.Wait(3000);
            this.interpanLock = false;
        });
    }
    checkInterpanLock() {
        if (this.interpanLock) {
            throw new Error(`Cannot execute command, in Inter-PAN mode`);
        }
    }
    async sendZclFrameInterPANToIeeeAddr(zclFrame, ieeeAddr) {
        return this.driver.queue.execute(async () => {
            debug('sendZclFrameInterPANToIeeeAddr');
            const frame = this.driver.makeApsFrame(zclFrame.Cluster.ID);
            frame.profileId = 0xFFFF;
            frame.sourceEndpoint = 12;
            frame.destinationEndpoint = 0xFE;
            //const ieee = new EmberEUI64(ieeeAddr);
            //frame.groupId = ieee;
            frame.options = types_1.EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY | types_1.EmberApsOption.APS_OPTION_RETRY;
            const dataConfirmResult = await this.driver.mrequest(frame, zclFrame.toBuffer());
        });
    }
    async sendZclFrameInterPANBroadcast(zclFrame, timeout) {
        return this.driver.queue.execute(async () => {
            debug('sendZclFrameInterPANBroadcast');
            const command = zclFrame.getCommand();
            if (!command.hasOwnProperty('response')) {
                throw new Error(`Command '${command.name}' has no response, cannot wait for response`);
            }
            const response = this.waitForInternal(null, 0xFE, null, zclFrame.Cluster.ID, command.response, timeout);
            try {
                const frame = this.driver.makeApsFrame(zclFrame.Cluster.ID);
                frame.profileId = 0xFFFF;
                frame.sourceEndpoint = 12;
                frame.destinationEndpoint = 0xFE;
                frame.groupId = 0xFFFF;
                frame.options = types_1.EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY | types_1.EmberApsOption.APS_OPTION_RETRY;
                const dataConfirmResult = await this.driver.mrequest(frame, zclFrame.toBuffer());
            }
            catch (error) {
                response.cancel();
                throw error;
            }
            return response.start().promise;
        });
    }
    async setTransmitPower(value) {
        debug(`setTransmitPower to ${value}`);
        return this.driver.queue.execute(async () => {
            await this.driver.setRadioPower(value);
        });
    }
    async setChannelInterPAN(channel) {
        return this.driver.queue.execute(async () => {
            this.interpanLock = true;
            await this.driver.setChannel(channel);
        });
    }
    waitForInternal(networkAddress, endpoint, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        const payload = {
            address: networkAddress, endpoint, clusterID, commandIdentifier,
            transactionSequenceNumber,
        };
        const waiter = this.waitress.waitFor(payload, timeout);
        const cancel = () => this.waitress.remove(waiter.ID);
        return { start: waiter.start, cancel };
    }
    waitFor(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        const waiter = this.waitForInternal(networkAddress, endpoint, transactionSequenceNumber, clusterID, commandIdentifier, timeout);
        return { cancel: waiter.cancel, promise: waiter.start().promise };
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
            matcher.commandIdentifier === payload.frame.Header.commandIdentifier;
    }
}
exports.default = EZSPAdapter;
//# sourceMappingURL=ezspAdapter.js.map