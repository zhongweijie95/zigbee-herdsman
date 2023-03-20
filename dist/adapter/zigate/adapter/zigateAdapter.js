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
const Events = __importStar(require("../../events"));
const adapter_1 = __importDefault(require("../../adapter"));
const zcl_1 = require("../../../zcl");
const utils_1 = require("../../../utils");
const zigate_1 = __importDefault(require("../driver/zigate"));
const debug_1 = require("../debug");
const constants_1 = require("../driver/constants");
const buffalo_1 = require("../../../buffalo");
const debug = debug_1.Debug('adapter');
const default_bind_group = 901; // https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/lib/constants.js#L3
const channelsToMask = (channels) => channels.map((x) => 2 ** x).reduce((acc, x) => acc + x, 0);
class ZiGateAdapter extends adapter_1.default {
    constructor(networkOptions, serialPortOptions, backupPath, adapterOptions, logger) {
        super(networkOptions, serialPortOptions, backupPath, adapterOptions, logger);
        this.joinPermitted = false;
        this.driver = new zigate_1.default(serialPortOptions.path, serialPortOptions);
        this.waitress = new utils_1.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
        this.driver.on('received', this.zclDataListener.bind(this));
        this.driver.on('receivedRaw', this.rawDataListener.bind(this));
        this.driver.on('LeaveIndication', this.leaveIndicationListener.bind(this));
        this.driver.on('DeviceAnnounce', this.deviceAnnounceListener.bind(this));
    }
    /**
     * Adapter methods
     */
    async start() {
        let startResult = 'resumed';
        try {
            await this.driver.open();
            debug.log("Connected to ZiGate adapter successfully.");
            const resetResponse = await this.driver.sendCommand(constants_1.ZiGateCommandCode.Reset, {}, 5000);
            if (resetResponse.code === constants_1.ZiGateMessageCode.RestartNonFactoryNew) {
                startResult = 'resumed';
            }
            else if (resetResponse.code === constants_1.ZiGateMessageCode.RestartFactoryNew) {
                startResult = 'reset';
            }
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.RawMode, { enabled: 0x01 });
            // @todo check
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.SetDeviceType, {
                deviceType: constants_1.DEVICE_TYPE.coordinator
            });
            await this.initNetwork();
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.AddGroup, {
                addressMode: constants_1.ADDRESS_MODE.short,
                shortAddress: 0x0000,
                sourceEndpoint: 0x01,
                destinationEndpoint: 0x01,
                groupAddress: default_bind_group
            });
        }
        catch (error) {
            throw new Error("failed to connect to zigate adapter " + error.message);
        }
        const concurrent = this.adapterOptions && this.adapterOptions.concurrent ?
            this.adapterOptions.concurrent : 2;
        debug.log(`Adapter concurrent: ${concurrent}`);
        this.queue = new utils_1.Queue(concurrent);
        return startResult; // 'resumed' | 'reset' | 'restored'
    }
    async stop() {
        this.closing = true;
        await this.driver.close();
    }
    async getCoordinator() {
        debug.log('getCoordinator');
        const networkResponse = await this.driver.sendCommand(constants_1.ZiGateCommandCode.GetNetworkState);
        // @TODO deal hardcoded endpoints, made by analogy with deconz
        // polling the coordinator on some firmware went into a memory leak, so we don't ask this info
        const response = {
            networkAddress: 0,
            manufacturerID: 0,
            ieeeAddr: networkResponse.payload.extendedAddress,
            endpoints: constants_1.coordinatorEndpoints
        };
        debug.log('getCoordinator %o', response);
        return response;
    }
    ;
    async getCoordinatorVersion() {
        debug.log('getCoordinatorVersion');
        return this.driver.sendCommand(constants_1.ZiGateCommandCode.GetVersion, {})
            .then((result) => {
            const meta = {
                "transportrev": 0,
                "product": 0,
                "majorrel": parseInt(result.payload.major).toString(16),
                "minorrel": parseInt(result.payload.minor).toString(16),
                "maintrel": parseInt(result.payload.revision).toString(16),
                "revision": parseInt(result.payload.revision).toString(16),
            };
            const version = {
                type: 'zigate',
                meta: meta,
            };
            return Promise.resolve(version);
        })
            .catch((e) => {
            debug.error(e);
            return Promise.reject();
        });
    }
    ;
    async permitJoin(seconds, networkAddress) {
        const result = await this.driver.sendCommand(constants_1.ZiGateCommandCode.PermitJoin, {
            targetShortAddress: networkAddress || 0xFFFC,
            interval: seconds,
            TCsignificance: 0
        });
        // const result = await this.driver.sendCommand(ZiGateCommandCode.PermitJoinStatus, {});
        // Suitable only for the coordinator, not the entire network or point-to-point for routers
        this.joinPermitted = result.payload.status === 0;
    }
    ;
    async reset(type) {
        debug.log('reset %s', type);
        if (type === 'soft') {
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.Reset, {}, 5000);
        }
        else if (type === 'hard') {
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.ErasePersistentData, {}, 5000);
        }
        return Promise.resolve();
    }
    ;
    async getNetworkParameters() {
        debug.log('getNetworkParameters');
        return this.driver.sendCommand(constants_1.ZiGateCommandCode.GetNetworkState, {}, 10000)
            .then((NetworkStateResponse) => {
            const resultPayload = {
                panID: NetworkStateResponse.payload.PANID,
                extendedPanID: NetworkStateResponse.payload.ExtPANID,
                channel: NetworkStateResponse.payload.Channel
            };
            return Promise.resolve(resultPayload);
        }).catch(() => Promise.reject());
    }
    ;
    /**
     * https://zigate.fr/documentation/deplacer-le-pdm-de-la-zigate/
     * pdm from host
     */
    async supportsBackup() {
        return false;
    }
    ;
    async backup() {
        throw new Error("This adapter does not support backup");
    }
    ;
    async setTransmitPower(value) {
        debug.log('setTransmitPower, %o', arguments);
        return this.driver.sendCommand(constants_1.ZiGateCommandCode.SetTXpower, { value: value })
            .then(() => Promise.resolve()).catch(() => Promise.reject());
    }
    ;
    async lqi(networkAddress) {
        return this.queue.execute(async () => {
            debug.log('lqi, %o', arguments);
            const neighbors = [];
            const add = (list) => {
                for (const entry of list) {
                    const relationByte = entry.readUInt8(18);
                    const extAddr = entry.slice(8, 16);
                    neighbors.push({
                        linkquality: entry.readUInt8(21),
                        networkAddress: entry.readUInt16LE(16),
                        ieeeAddr: new buffalo_1.Buffalo(extAddr).readIeeeAddr(),
                        relationship: (relationByte >> 1) & ((1 << 3) - 1),
                        depth: entry.readUInt8(20)
                    });
                }
            };
            const request = async (startIndex) => {
                try {
                    const resultPayload = await this.driver.sendCommand(constants_1.ZiGateCommandCode.ManagementLQI, { targetAddress: networkAddress, startIndex: startIndex });
                    const data = resultPayload.payload.payload;
                    if (data[1] !== 0) { // status
                        throw new Error(`LQI for '${networkAddress}' failed`);
                    }
                    const tableList = [];
                    const response = {
                        status: data[1],
                        tableEntrys: data[2],
                        startIndex: data[3],
                        tableListCount: data[4],
                        tableList: tableList
                    };
                    let tableEntry = [];
                    let counter = 0;
                    for (let i = 5; i < ((response.tableListCount * 22) + 5); i++) { // one tableentry = 22 bytes
                        tableEntry.push(data[i]);
                        counter++;
                        if (counter === 22) {
                            response.tableList.push(Buffer.from(tableEntry));
                            tableEntry = [];
                            counter = 0;
                        }
                    }
                    debug.log("LQI RESPONSE - addr: " + networkAddress.toString(16) + " status: "
                        + response.status + " read " + (response.tableListCount + response.startIndex)
                        + "/" + response.tableEntrys + " entrys");
                    return response;
                }
                catch (error) {
                    debug.log("LQI REQUEST FAILED - addr: 0x" + networkAddress.toString(16) + " " + error);
                    return Promise.reject();
                }
            };
            let response = await request(0);
            add(response.tableList);
            let nextStartIndex = response.tableListCount;
            while (neighbors.length < response.tableEntrys) {
                response = await request(nextStartIndex);
                add(response.tableList);
                nextStartIndex += response.tableListCount;
            }
            return { neighbors };
        }, networkAddress);
    }
    ;
    // @TODO
    routingTable(networkAddress) {
        debug.log('RoutingTable, %o', arguments);
        return;
    }
    ;
    async nodeDescriptor(networkAddress) {
        return this.queue.execute(async () => {
            debug.log('nodeDescriptor, \n %o', arguments);
            try {
                const nodeDescriptorResponse = await this.driver.sendCommand(constants_1.ZiGateCommandCode.NodeDescriptor, {
                    targetShortAddress: networkAddress
                });
                const data = nodeDescriptorResponse.payload.payload;
                const buf = data;
                const logicaltype = (data[4] & 7);
                let type = 'Unknown';
                switch (logicaltype) {
                    case 1:
                        type = 'Router';
                        break;
                    case 2:
                        type = 'EndDevice';
                        break;
                    case 0:
                        type = 'Coordinator';
                        break;
                }
                const manufacturer = buf.readUInt16LE(7);
                debug.log("RECEIVING NODE_DESCRIPTOR - addr: 0x" + networkAddress.toString(16)
                    + " type: " + type + " manufacturer: 0x" + manufacturer.toString(16));
                return { manufacturerCode: manufacturer, type };
            }
            catch (error) {
                debug.error("RECEIVING NODE_DESCRIPTOR FAILED - addr: 0x"
                    + networkAddress.toString(16) + " " + error);
                return Promise.reject();
            }
        }, networkAddress);
    }
    ;
    async activeEndpoints(networkAddress) {
        return this.queue.execute(async () => {
            debug.log('ActiveEndpoints request');
            const payload = {
                targetShortAddress: networkAddress
            };
            try {
                const result = await this.driver.sendCommand(constants_1.ZiGateCommandCode.ActiveEndpoint, payload);
                const buf = Buffer.from(result.payload.payload);
                const epCount = buf.readUInt8(4);
                const epList = [];
                for (let i = 5; i < (epCount + 5); i++) {
                    epList.push(buf.readUInt8(i));
                }
                const payloadAE = {
                    endpoints: epList
                };
                debug.log('ActiveEndpoints response: %o', payloadAE);
                return payloadAE;
            }
            catch (error) {
                debug.error("RECEIVING ActiveEndpoints FAILED, %o", error);
                return Promise.reject();
            }
        }, networkAddress);
    }
    ;
    async simpleDescriptor(networkAddress, endpointID) {
        return this.queue.execute(async () => {
            debug.log('SimpleDescriptor request: %o', arguments);
            try {
                const payload = {
                    targetShortAddress: networkAddress,
                    endpoint: endpointID
                };
                const result = await this.driver.sendCommand(constants_1.ZiGateCommandCode.SimpleDescriptor, payload);
                const buf = result.payload.payload;
                if (buf.length > 11) {
                    const inCount = buf.readUInt8(11);
                    const inClusters = [];
                    let cIndex = 12;
                    for (let i = 0; i < inCount; i++) {
                        inClusters[i] = buf.readUInt16LE(cIndex);
                        cIndex += 2;
                    }
                    const outCount = buf.readUInt8(12 + (inCount * 2));
                    const outClusters = [];
                    cIndex = 13 + (inCount * 2);
                    for (let l = 0; l < outCount; l++) {
                        outClusters[l] = buf.readUInt16LE(cIndex);
                        cIndex += 2;
                    }
                    const resultPayload = {
                        profileID: buf.readUInt16LE(6),
                        endpointID: buf.readUInt8(5),
                        deviceID: buf.readUInt16LE(8),
                        inputClusters: inClusters,
                        outputClusters: outClusters
                    };
                    return resultPayload;
                }
            }
            catch (error) {
                debug.error("RECEIVING SIMPLE_DESCRIPTOR FAILED - addr: 0x" + networkAddress.toString(16)
                    + " EP:" + endpointID + " " + error);
                return Promise.reject();
            }
        }, networkAddress);
    }
    ;
    async bind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.queue.execute(async () => {
            debug.log('bind %o', arguments);
            let payload = {
                targetExtendedAddress: sourceIeeeAddress,
                targetEndpoint: sourceEndpoint,
                clusterID: clusterID,
                destinationAddressMode: (type === 'group') ? constants_1.ADDRESS_MODE.group : constants_1.ADDRESS_MODE.ieee,
                destinationAddress: destinationAddressOrGroup,
            };
            if (typeof destinationEndpoint !== undefined) {
                // @ts-ignore
                payload['destinationEndpoint'] = destinationEndpoint;
            }
            const result = await this.driver.sendCommand(constants_1.ZiGateCommandCode.Bind, payload, null, { destinationNetworkAddress });
            let data = result.payload.payload;
            if (data[1] === 0) {
                debug.log('Bind %s success', sourceIeeeAddress);
                return Promise.resolve();
            }
            else {
                debug.error('Bind %s failed', sourceIeeeAddress);
                return Promise.reject();
            }
        }, destinationNetworkAddress);
    }
    ;
    async unbind(destinationNetworkAddress, sourceIeeeAddress, sourceEndpoint, clusterID, destinationAddressOrGroup, type, destinationEndpoint) {
        return this.queue.execute(async () => {
            debug.log('unbind %o', arguments);
            let payload = {
                targetExtendedAddress: sourceIeeeAddress,
                targetEndpoint: sourceEndpoint,
                clusterID: clusterID,
                destinationAddressMode: (type === 'group') ? constants_1.ADDRESS_MODE.group : constants_1.ADDRESS_MODE.ieee,
                destinationAddress: destinationAddressOrGroup,
            };
            if (typeof destinationEndpoint !== undefined) {
                // @ts-ignore
                payload['destinationEndpoint'] = destinationEndpoint;
            }
            const result = await this.driver.sendCommand(constants_1.ZiGateCommandCode.UnBind, payload, null, { destinationNetworkAddress });
            let data = result.payload.payload;
            if (data[1] === 0) {
                debug.log('Unbind %s success', sourceIeeeAddress);
                return Promise.resolve();
            }
            else {
                debug.error('Unbind %s failed', sourceIeeeAddress);
                return Promise.reject();
            }
        }, destinationNetworkAddress);
    }
    ;
    async removeDevice(networkAddress, ieeeAddr) {
        return this.queue.execute(async () => {
            const payload = {
                shortAddress: networkAddress,
                extendedAddress: ieeeAddr,
                rejoin: 0,
                removeChildren: 0
            };
            return this.driver.sendCommand(constants_1.ZiGateCommandCode.ManagementLeaveRequest, payload)
                .then((Response) => {
                return Promise.resolve();
            }).catch(() => Promise.reject());
        }, networkAddress);
    }
    ;
    async sendZclFrameToEndpoint(ieeeAddr, networkAddress, endpoint, zclFrame, timeout, disableResponse, disableRecovery, sourceEndpoint) {
        return this.queue.execute(async () => {
            return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint || 1, zclFrame, timeout, disableResponse, disableRecovery, 0, 0, false, false);
        }, networkAddress);
    }
    ;
    async sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt, dataRequestAttempt, checkedNetworkAddress, discoveredRoute) {
        debug.info('sendZclFrameToEndpointInternal %s:%i/%i (%i,%i,%i)', ieeeAddr, networkAddress, endpoint, responseAttempt, dataRequestAttempt, this.queue.count());
        let response = null;
        const data = zclFrame.toBuffer();
        const command = zclFrame.getCommand();
        const payload = {
            addressMode: constants_1.ADDRESS_MODE.short,
            targetShortAddress: networkAddress,
            sourceEndpoint: sourceEndpoint || 0x01,
            destinationEndpoint: endpoint,
            profileID: 0x0104,
            clusterID: zclFrame.Cluster.ID,
            securityMode: 0x02,
            radius: 30,
            dataLength: data.length,
            data: data,
        };
        if (command.hasOwnProperty('response') && disableResponse === false) {
            response = this.waitFor(networkAddress, endpoint, zclFrame.Header.frameControl.frameType, zcl_1.Direction.SERVER_TO_CLIENT, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, command.response, timeout);
        }
        else if (!zclFrame.Header.frameControl.disableDefaultResponse) {
            response = this.waitFor(networkAddress, endpoint, zcl_1.FrameType.GLOBAL, zcl_1.Direction.SERVER_TO_CLIENT, zclFrame.Header.transactionSequenceNumber, zclFrame.Cluster.ID, zcl_1.Foundation.defaultRsp.ID, timeout);
        }
        await this.driver.sendCommand(constants_1.ZiGateCommandCode.RawAPSDataRequest, payload, undefined, {}, disableResponse).catch((e) => {
            if (responseAttempt < 1 && !disableRecovery) {
                // @todo discover route
                return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt + 1, dataRequestAttempt, checkedNetworkAddress, discoveredRoute);
            }
        });
        // @TODO add dataConfirmResult
        // @TODO if error codes route / no_resourses wait and resend
        if (response !== null) {
            try {
                // @ts-ignore
                return await response.promise;
                // @todo discover route
            }
            catch (error) {
                debug.error('Response error %s (%s:%d,%d)', error.toString(), ieeeAddr, networkAddress, responseAttempt);
                if (responseAttempt < 1 && !disableRecovery) {
                    return this.sendZclFrameToEndpointInternal(ieeeAddr, networkAddress, endpoint, sourceEndpoint, zclFrame, timeout, disableResponse, disableRecovery, responseAttempt + 1, dataRequestAttempt, checkedNetworkAddress, discoveredRoute);
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
    async sendZclFrameToAll(endpoint, zclFrame, sourceEndpoint) {
        return this.queue.execute(async () => {
            if (sourceEndpoint !== 0x01 /*&& sourceEndpoint !== 242*/) { // @todo on zigate firmware without gp causes hang
                debug.error('source endpoint %d, not supported', sourceEndpoint);
                return;
            }
            const data = zclFrame.toBuffer();
            const payload = {
                addressMode: constants_1.ADDRESS_MODE.short,
                targetShortAddress: 0xFFFD,
                sourceEndpoint: sourceEndpoint,
                destinationEndpoint: endpoint,
                profileID: /*sourceEndpoint === 242 ? 0xa1e0 :*/ 0x0104,
                clusterID: zclFrame.Cluster.ID,
                securityMode: 0x02,
                radius: 30,
                dataLength: data.length,
                data: data,
            };
            debug.log('sendZclFrameToAll %o', payload);
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.RawAPSDataRequest, payload, undefined, {}, true);
            await utils_1.Wait(200);
        });
    }
    ;
    async sendZclFrameToGroup(groupID, zclFrame, sourceEndpoint) {
        return this.queue.execute(async () => {
            debug.log('sendZclFrameToGroup %o', arguments);
            const data = zclFrame.toBuffer();
            const payload = {
                addressMode: constants_1.ADDRESS_MODE.group,
                targetShortAddress: groupID,
                sourceEndpoint: sourceEndpoint || 0x01,
                destinationEndpoint: 0xFF,
                profileID: 0x0104,
                clusterID: zclFrame.Cluster.ID,
                securityMode: 0x02,
                radius: 30,
                dataLength: data.length,
                data: data,
            };
            debug.log('sendZclFrameToGroup: \n %o', payload);
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.RawAPSDataRequest, payload, undefined, {}, true);
            await utils_1.Wait(200);
        });
    }
    ;
    /**
     * Supplementary functions
     */
    async initNetwork() {
        debug.log(`Set channel mask ${this.networkOptions.channelList} key`);
        await this.driver.sendCommand(constants_1.ZiGateCommandCode.SetChannelMask, { channelMask: channelsToMask(this.networkOptions.channelList) });
        debug.log(`Set security key`);
        await this.driver.sendCommand(constants_1.ZiGateCommandCode.SetSecurityStateKey, {
            keyType: this.networkOptions.networkKeyDistribute ?
                constants_1.ZPSNwkKeyState.ZPS_ZDO_DISTRIBUTED_LINK_KEY :
                constants_1.ZPSNwkKeyState.ZPS_ZDO_PRECONFIGURED_LINK_KEY,
            key: this.networkOptions.networkKey,
        });
        try {
            // The block is wrapped in trapping because if the network is already created, the firmware does not accept the new key.
            debug.log('Set EPanID %h', this.networkOptions.extendedPanID);
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.SetExtendedPANID, {
                panId: this.networkOptions.extendedPanID,
            });
            await this.driver.sendCommand(constants_1.ZiGateCommandCode.StartNetwork, {});
        }
        catch (e) {
            // @TODO Depending on the type of error, output clear text to the user
            debug.error("%o", e);
        }
        return Promise.resolve();
    }
    waitFor(networkAddress, endpoint, frameType, direction, transactionSequenceNumber, clusterID, commandIdentifier, timeout) {
        debug.log('waitForInternal %o', arguments);
        const payload = {
            address: networkAddress,
            endpoint,
            clusterID,
            commandIdentifier,
            frameType,
            direction,
            transactionSequenceNumber,
        };
        const waiter = this.waitress.waitFor(payload, timeout);
        const cancel = () => this.waitress.remove(waiter.ID);
        return { promise: waiter.start().promise, cancel };
    }
    ;
    static async isValidPath(path) {
        return zigate_1.default.isValidPath(path);
    }
    static async autoDetectPath() {
        return zigate_1.default.autoDetectPath();
    }
    /**
     * InterPAN !!! not implemented
     */
    async setChannelInterPAN(channel) {
        debug.log('setChannelInterPAN', arguments);
        return Promise.reject();
    }
    ;
    async sendZclFrameInterPANToIeeeAddr(zclFrame, ieeeAddress) {
        debug.log('sendZclFrameInterPANToIeeeAddr', arguments);
        return Promise.reject();
    }
    ;
    async sendZclFrameInterPANBroadcast(zclFrame, timeout) {
        debug.log('sendZclFrameInterPANBroadcast', arguments);
        return Promise.reject();
    }
    ;
    restoreChannelInterPAN() {
        debug.log('restoreChannelInterPAN', arguments);
        return Promise.reject();
    }
    ;
    deviceAnnounceListener(networkAddress, ieeeAddr) {
        // @todo debounce
        const payload = { networkAddress, ieeeAddr };
        if (this.joinPermitted === true) {
            this.emit(Events.Events.deviceJoined, payload);
        }
        else {
            this.emit(Events.Events.deviceAnnounce, payload);
        }
    }
    zclDataListener(data) {
        if (data.zclFrame instanceof zcl_1.ZclFrame) {
            const payload = {
                address: data.ziGateObject.payload.sourceAddress,
                frame: data.zclFrame,
                endpoint: data.ziGateObject.payload.sourceEndpoint,
                linkquality: data.ziGateObject.frame.readRSSI(),
                groupID: null,
                wasBroadcast: false,
                destinationEndpoint: data.ziGateObject.payload.destinationEndpoint,
            };
            this.waitress.resolve(payload);
            this.emit(Events.Events.zclData, payload);
        }
        else {
            debug.error('msg not zclFrame', data.zclFrame);
        }
    }
    rawDataListener(data) {
        const payload = {
            clusterID: data.ziGateObject.payload.clusterID,
            data: data.ziGateObject.payload.payload,
            address: data.ziGateObject.payload.sourceAddress,
            endpoint: data.ziGateObject.payload.sourceEndpoint,
            linkquality: data.ziGateObject.frame.readRSSI(),
            groupID: null,
            wasBroadcast: false,
            destinationEndpoint: data.ziGateObject.payload.destinationEndpoint,
        };
        this.emit(Events.Events.rawData, payload);
    }
    leaveIndicationListener(data) {
        debug.log('LeaveIndication %o', data);
        const payload = {
            networkAddress: data.ziGateObject.payload.extendedAddress,
            ieeeAddr: data.ziGateObject.payload.extendedAddress
        };
        this.emit(Events.Events.deviceLeave, payload);
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `Timeout - ${matcher.address} - ${matcher.endpoint}` +
            ` - ${matcher.transactionSequenceNumber} - ${matcher.clusterID}` +
            ` - ${matcher.commandIdentifier} after ${timeout}ms`;
    }
    waitressValidator(payload, matcher) {
        const transactionSequenceNumber = payload.frame.Header.transactionSequenceNumber;
        return (!matcher.address || payload.address === matcher.address) &&
            matcher.endpoint === payload.endpoint &&
            (!matcher.transactionSequenceNumber || transactionSequenceNumber === matcher.transactionSequenceNumber) &&
            matcher.clusterID === payload.frame.Cluster.ID &&
            matcher.frameType === payload.frame.Header.frameControl.frameType &&
            matcher.commandIdentifier === payload.frame.Header.commandIdentifier &&
            matcher.direction === payload.frame.Header.frameControl.direction;
    }
}
exports.default = ZiGateAdapter;
//# sourceMappingURL=zigateAdapter.js.map