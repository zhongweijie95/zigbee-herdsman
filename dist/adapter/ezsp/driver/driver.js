"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Driver = void 0;
const ezsp_1 = require("./ezsp");
const types_1 = require("./types");
const events_1 = require("events");
const struct_1 = require("./types/struct");
const utils_1 = require("./utils");
const named_1 = require("./types/named");
const multicast_1 = require("./multicast");
const utils_2 = require("../../../utils");
const debug_1 = __importDefault(require("debug"));
const es6_1 = __importDefault(require("fast-deep-equal/es6"));
const debug = {
    error: debug_1.default('zigbee-herdsman:adapter:ezsp:driver:error'),
    log: debug_1.default('zigbee-herdsman:adapter:ezsp:driver'),
};
class Driver extends events_1.EventEmitter {
    constructor() {
        super();
        this.direct = named_1.EmberOutgoingMessageType.OUTGOING_DIRECT;
        this.eui64ToNodeId = new Map();
        this.eui64ToRelays = new Map();
        this.transactionID = 1;
        this.queue = new utils_2.Queue();
        this.waitress = new utils_2.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
    }
    async onReset() {
        let attempts = 0;
        const pauses = [10, 30, 60];
        let pause = 0;
        while (true) {
            debug.log(`Reset connection. Try ${attempts}`);
            try {
                await this.stop();
                this.ezsp = undefined;
                await utils_2.Wait(1000);
                await this.startup(this.port, this.serialOpt, this.nwkOpt, this.greenPowerGroup);
                break;
            }
            catch (e) {
                debug.error(`Reset error ${e.stack}`);
                attempts += 1;
                if (pauses.length) {
                    pause = pauses.shift();
                }
                debug.log(`Pause ${pause}sec before try ${attempts}`);
                await utils_2.Wait(pause * 1000);
            }
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async startup(port, serialOpt, nwkOpt, greenPowerGroup) {
        this.nwkOpt = nwkOpt;
        this.port = port;
        this.serialOpt = serialOpt;
        this.greenPowerGroup = greenPowerGroup;
        this.transactionID = 1;
        this.ezsp = new ezsp_1.Ezsp();
        this.ezsp.on('reset', this.onReset.bind(this));
        await this.ezsp.connect(port, serialOpt);
        await this.ezsp.version();
        await this.ezsp.updateConfig();
        await this.ezsp.updatePolicies();
        //await this.ezsp.setValue(EzspValueId.VALUE_MAXIMUM_OUTGOING_TRANSFER_SIZE, 82);
        //await this.ezsp.setValue(EzspValueId.VALUE_MAXIMUM_INCOMING_TRANSFER_SIZE, 82);
        await this.ezsp.setValue(named_1.EzspValueId.VALUE_END_DEVICE_KEEP_ALIVE_SUPPORT_MODE, 3);
        await this.ezsp.setSourceRouting();
        //const count = await ezsp.getConfigurationValue(EzspConfigId.CONFIG_APS_UNICAST_MESSAGE_COUNT);
        //debug.log("APS_UNICAST_MESSAGE_COUNT is set to %s", count);
        //await this.addEndpoint({outputClusters: [0x0500]});
        await this.addEndpoint({
            inputClusters: [0x0000, 0x0003, 0x0006, 0x000A, 0x0019, 0x001A, 0x0300],
            outputClusters: [0x0000, 0x0003, 0x0004, 0x0005, 0x0006, 0x0008, 0x0020,
                0x0300, 0x0400, 0x0402, 0x0405, 0x0406, 0x0500, 0x0B01, 0x0B03,
                0x0B04, 0x0702, 0x1000, 0xFC01, 0xFC02]
        });
        await this.addEndpoint({
            endpoint: 242, profileId: 0xA10E, deviceId: 0x61,
            outputClusters: [0x0021]
        });
        // getting MFG_STRING token
        //const mfgName = await ezsp.execCommand('getMfgToken', EzspMfgTokenId.MFG_STRING);
        // getting MFG_BOARD_NAME token
        //const boardName = await ezsp.execCommand('getMfgToken', EzspMfgTokenId.MFG_BOARD_NAME);
        /* eslint-disable prefer-const */
        let verInfo = await this.ezsp.getValue(named_1.EzspValueId.VALUE_VERSION_INFO);
        let build, major, minor, patch, special;
        [build, verInfo] = types_1.uint16_t.deserialize(types_1.uint16_t, verInfo);
        [major, verInfo] = types_1.uint8_t.deserialize(types_1.uint8_t, verInfo);
        [minor, verInfo] = types_1.uint8_t.deserialize(types_1.uint8_t, verInfo);
        [patch, verInfo] = types_1.uint8_t.deserialize(types_1.uint8_t, verInfo);
        [special, verInfo] = types_1.uint8_t.deserialize(types_1.uint8_t, verInfo);
        /* eslint-enable prefer-const */
        const vers = `${major}.${minor}.${patch}.${special} build ${build}`;
        debug.log(`EmberZNet version: ${vers}`);
        this.version = {
            product: this.ezsp.ezspV,
            majorrel: `${major}`,
            minorrel: `${minor}`,
            maintrel: `${patch} `,
            revision: vers
        };
        if (await this.needsToBeInitialised(nwkOpt)) {
            const currentState = await this.ezsp.execCommand('networkState');
            debug.log('Network state', currentState);
            if (currentState == named_1.EmberNetworkStatus.JOINED_NETWORK) {
                debug.log(`Leaving current network and forming new network`);
                const st = await this.ezsp.leaveNetwork();
                console.assert(st == types_1.EmberStatus.NETWORK_DOWN, `leaveNetwork returned unexpected status: ${st}`);
            }
            await this.form_network();
        }
        const state = await this.ezsp.execCommand('networkState');
        debug.log('Network state', state);
        const [status, nodeType, networkParams] = await this.ezsp.execCommand('getNetworkParameters');
        console.assert(status == types_1.EmberStatus.SUCCESS, `Command (getNetworkParameters) returned unexpected state: ${status}`);
        this.networkParams = networkParams;
        debug.log("Node type: %s, Network parameters: %s", nodeType, networkParams);
        const [nwk] = await this.ezsp.execCommand('getNodeId');
        const [ieee] = await this.ezsp.execCommand('getEui64');
        this.ieee = new named_1.EmberEUI64(ieee);
        debug.log('Network ready');
        this.ezsp.on('frame', this.handleFrame.bind(this));
        this.handleNodeJoined(nwk, this.ieee);
        debug.log(`EZSP nwk=${nwk}, IEEE=0x${this.ieee}`);
        this.multicast = new multicast_1.Multicast(this);
        await this.multicast.startup([]);
        await this.multicast.subscribe(242, greenPowerGroup);
        // await this.multicast.subscribe(1, 901);
    }
    async needsToBeInitialised(options) {
        let valid = true;
        valid = valid && (await this.ezsp.networkInit());
        const [status, nodeType, networkParams] = await this.ezsp.execCommand('getNetworkParameters');
        debug.log("Current Node type: %s, Network parameters: %s", nodeType, networkParams);
        valid = valid && (status == types_1.EmberStatus.SUCCESS);
        valid = valid && (nodeType == types_1.EmberNodeType.COORDINATOR);
        valid = valid && (options.panID == networkParams.panId);
        valid = valid && (options.channelList.includes(networkParams.radioChannel));
        valid = valid && (es6_1.default(options.extendedPanID, networkParams.extendedPanId));
        return !valid;
    }
    async form_network() {
        let status;
        [status] = await this.ezsp.execCommand('clearKeyTable');
        console.assert(status == types_1.EmberStatus.SUCCESS, `Command (clearKeyTable) returned unexpected state: ${status}`);
        const panID = this.nwkOpt.panID;
        const extendedPanID = this.nwkOpt.extendedPanID;
        const initial_security_state = utils_1.ember_security(this.nwkOpt);
        [status] = await this.ezsp.setInitialSecurityState(initial_security_state);
        const parameters = new struct_1.EmberNetworkParameters();
        parameters.panId = panID;
        parameters.extendedPanId = extendedPanID;
        parameters.radioTxPower = 5;
        parameters.radioChannel = this.nwkOpt.channelList[0];
        parameters.joinMethod = named_1.EmberJoinMethod.USE_MAC_ASSOCIATION;
        parameters.nwkManagerId = 0;
        parameters.nwkUpdateId = 0;
        parameters.channels = 0x07FFF800; // all channels
        await this.ezsp.formNetwork(parameters);
        await this.ezsp.setValue(named_1.EzspValueId.VALUE_STACK_TOKEN_WRITING, 1);
        await this.ezsp.execCommand('getKey', named_1.EmberKeyType.TRUST_CENTER_LINK_KEY);
        await this.ezsp.execCommand('getKey', named_1.EmberKeyType.CURRENT_NETWORK_KEY);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    handleFrame(frameName, ...args) {
        switch (true) {
            case (frameName === 'incomingMessageHandler'): {
                const [messageType, apsFrame, lqi, rssi, sender, bindingIndex, addressIndex, message] = args;
                const eui64 = this.eui64ToNodeId.get(sender);
                const handled = this.waitress.resolve({ address: sender, payload: message, frame: apsFrame });
                if (!handled) {
                    this.emit('incomingMessage', {
                        messageType, apsFrame, lqi, rssi, sender, bindingIndex, addressIndex, message,
                        senderEui64: eui64
                    });
                }
                break;
            }
            case (frameName === 'trustCenterJoinHandler'): {
                /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
                const [nwk, ieee, devUpdate, joinDecision, parent] = args;
                if (devUpdate === named_1.EmberDeviceUpdate.DEVICE_LEFT) {
                    this.handleNodeLeft(nwk, ieee);
                }
                else {
                    this.handleNodeJoined(nwk, ieee);
                }
                break;
            }
            case (frameName === 'incomingRouteRecordHandler'): {
                const [nwk, ieee, lqi, rssi, relays] = args;
                this.handleRouteRecord(nwk, ieee, lqi, rssi, relays);
                break;
            }
            case (frameName === 'incomingRouteErrorHandler'): {
                const [status, nwk] = args;
                this.handleRouteError(status, nwk);
                break;
            }
            case (frameName === 'messageSentHandler'): {
                // todo
                const status = args[4];
                if (status != 0) {
                    // send failure
                }
                else {
                    // send success
                    // If there was a message to the group and this group is not known, 
                    // then we will register the coordinator in this group
                    // Applicable for IKEA remotes
                    const msgType = args[0];
                    if (msgType == named_1.EmberOutgoingMessageType.OUTGOING_MULTICAST) {
                        const apsFrame = args[2];
                        if (apsFrame.destinationEndpoint == 255) {
                            this.multicast.subscribe(apsFrame.groupId, 1);
                        }
                    }
                }
                break;
            }
            default:
                // <=== Application frame 35 (childJoinHandler) received: 00013e9c2ebd08feff9ffd9004 +1ms
                // <=== Application frame 35 (childJoinHandler)   parsed: 0,1,39998,144,253,159,255,254,8,189,46,4 +1ms
                // Unhandled frame childJoinHandler +2s
                // <=== Application frame 98 (incomingSenderEui64Handler) received: 2ebd08feff9ffd90 +2ms
                // <=== Application frame 98 (incomingSenderEui64Handler)   parsed: 144,253,159,255,254,8,189,46 +1ms
                // Unhandled frame incomingSenderEui64Handler
                // <=== Application frame 155 (zigbeeKeyEstablishmentHandler) received: 2ebd08feff9ffd9006 +2ms
                // <=== Application frame 155 (zigbeeKeyEstablishmentHandler)   parsed: 144,253,159,255,254,8,189,46,6 +2ms
                // Unhandled frame zigbeeKeyEstablishmentHandler
                debug.log(`Unhandled frame ${frameName}`);
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    handleRouteRecord(nwk, ieee, lqi, rssi, relays) {
        // todo
        debug.log(`handleRouteRecord: nwk=${nwk}, ieee=${ieee}, lqi=${lqi}, rssi=${rssi}, relays=${relays}`);
        this.setNode(nwk, ieee);
        if (ieee && !(ieee instanceof named_1.EmberEUI64)) {
            ieee = new named_1.EmberEUI64(ieee);
        }
        this.eui64ToRelays.set(ieee.toString(), relays);
    }
    async handleRouteError(status, nwk) {
        // todo
        debug.log(`handleRouteError: nwk=${nwk}, status=${status}`);
        this.waitress.reject({ address: nwk, payload: null, frame: null }, 'Route error');
        const ieee = await this.networkIdToEUI64(nwk);
        this.eui64ToRelays.set(ieee.toString(), null);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    handleNodeLeft(nwk, ieee) {
        if (ieee && !(ieee instanceof named_1.EmberEUI64)) {
            ieee = new named_1.EmberEUI64(ieee);
        }
        this.eui64ToNodeId.delete(ieee.toString());
        this.emit('deviceLeft', [nwk, ieee]);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    handleNodeJoined(nwk, ieee) {
        if (ieee && !(ieee instanceof named_1.EmberEUI64)) {
            ieee = new named_1.EmberEUI64(ieee);
        }
        this.eui64ToNodeId.set(ieee.toString(), nwk);
        this.emit('deviceJoined', [nwk, ieee]);
    }
    setNode(nwk, ieee) {
        if (ieee && !(ieee instanceof named_1.EmberEUI64)) {
            ieee = new named_1.EmberEUI64(ieee);
        }
        this.eui64ToNodeId.set(ieee.toString(), nwk);
    }
    async request(nwk, apsFrame, 
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    data, timeout = 30000) {
        try {
            const seq = (apsFrame.sequence + 1) & 0xFF;
            let eui64;
            if (typeof nwk !== 'number') {
                eui64 = nwk;
                const strEui64 = eui64.toString();
                let nodeId = this.eui64ToNodeId.get(strEui64);
                if (nodeId === undefined) {
                    nodeId = await this.ezsp.execCommand('lookupNodeIdByEui64', eui64);
                    if (nodeId && nodeId !== 0xFFFF) {
                        this.eui64ToNodeId.set(strEui64, nodeId);
                    }
                    else {
                        throw new Error('Unknown EUI64:' + strEui64);
                    }
                }
                nwk = nodeId;
            }
            else {
                eui64 = await this.networkIdToEUI64(nwk);
            }
            await this.ezsp.execCommand('setExtendedTimeout', eui64, true);
            // for old emberznet < 8
            // const route = this.eui64ToRelays.get(eui64.toString());
            // if (route) {
            //     const [status] = await this.ezsp.execCommand('setSourceRoute', eui64, );
            // }
            await this.ezsp.sendUnicast(this.direct, nwk, apsFrame, seq, data);
            return true;
        }
        catch (e) {
            debug.error(`Request error ${e}: ${e.stack}`);
            return false;
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    async mrequest(apsFrame, data, timeout = 30000) {
        try {
            const seq = (apsFrame.sequence + 1) & 0xFF;
            await this.ezsp.sendMulticast(apsFrame, seq, data);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    nextTransactionID() {
        this.transactionID = (this.transactionID + 1) & 0xFF;
        return this.transactionID;
    }
    makeApsFrame(clusterId) {
        const frame = new struct_1.EmberApsFrame();
        frame.clusterId = clusterId;
        frame.profileId = 0;
        frame.sequence = this.nextTransactionID();
        frame.sourceEndpoint = 0;
        frame.destinationEndpoint = 0;
        frame.groupId = 0;
        //frame.options = EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY;
        //frame.options = EmberApsOption.APS_OPTION_ENABLE_ROUTE_DISCOVERY|EmberApsOption.APS_OPTION_RETRY;
        frame.options = types_1.EmberApsOption.APS_OPTION_NONE;
        return frame;
    }
    async zdoRequest(networkAddress, requestCmd, 
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    responseCmd, ...args) {
        const requestName = types_1.EmberZDOCmd.valueName(types_1.EmberZDOCmd, requestCmd);
        const responseName = types_1.EmberZDOCmd.valueName(types_1.EmberZDOCmd, responseCmd);
        debug.log(`${requestName} params: ${[...args]}`);
        const frame = this.makeApsFrame(requestCmd);
        const payload = this.makeZDOframe(requestName, frame.sequence, ...args);
        debug.log(`${requestName}  frame: ${payload}`);
        const response = this.waitFor(networkAddress, responseCmd, frame.sequence).start();
        const res = await this.request(networkAddress, frame, payload);
        if (!res) {
            debug.error(`zdoRequest error`);
            this.waitress.remove(response.ID);
            throw Error('ZdoRequest error');
        }
        const message = await response.promise;
        debug.log(`${responseName}  frame: ${JSON.stringify(message.payload)}`);
        const result = this.parse_frame_payload(responseName, message.payload);
        debug.log(`${responseName} parsed: ${JSON.stringify(result)}`);
        return result;
    }
    async stop() {
        if (this.ezsp) {
            debug.log('Stop driver');
            return this.ezsp.close();
        }
    }
    getLocalEUI64() {
        return this.ezsp.execCommand('getEui64');
    }
    async networkIdToEUI64(nwk) {
        for (const [eUI64, value] of this.eui64ToNodeId) {
            if (value === nwk)
                return new named_1.EmberEUI64(eUI64);
        }
        const value = await this.ezsp.execCommand('lookupEui64ByNodeId', nwk);
        if (value[0] === types_1.EmberStatus.SUCCESS) {
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
            const eUI64 = new named_1.EmberEUI64(value[1]);
            this.eui64ToNodeId.set(eUI64.toString(), nwk);
            return eUI64;
        }
        else {
            throw new Error('Unrecognized nodeId:' + nwk);
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async permitJoining(seconds) {
        await this.ezsp.setPolicy(named_1.EzspPolicyId.TRUST_CENTER_POLICY, named_1.EzspDecisionBitmask.IGNORE_UNSECURED_REJOINS | named_1.EzspDecisionBitmask.ALLOW_JOINS);
        return this.ezsp.execCommand('permitJoining', seconds);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    makeZDOframe(name, ...args) {
        return this.ezsp.makeZDOframe(name, ...args);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    parse_frame_payload(name, obj) {
        return this.ezsp.parse_frame_payload(name, obj);
    }
    async addEndpoint({ endpoint = 1, profileId = 260, deviceId = 0xBEEF, appFlags = 0, inputClusters = [], outputClusters = [] }) {
        const res = await this.ezsp.execCommand('addEndpoint', endpoint, profileId, deviceId, appFlags, inputClusters.length, outputClusters.length, inputClusters, outputClusters);
        debug.log("Ezsp adding endpoint: %s", res);
    }
    waitFor(address, clusterId, sequence, timeout = 30000) {
        return this.waitress.waitFor({ address, clusterId, sequence }, timeout);
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }
    waitressValidator(payload, matcher) {
        return (!matcher.address || payload.address === matcher.address) &&
            (!payload.frame || payload.frame.clusterId === matcher.clusterId) &&
            (!payload.frame || payload.payload[0] === matcher.sequence);
    }
    setRadioPower(value) {
        return this.ezsp.execCommand('setRadioPower', value);
    }
    setChannel(channel) {
        return this.ezsp.execCommand('setLogicalAndRadioChannel', channel);
    }
}
exports.Driver = Driver;
//# sourceMappingURL=driver.js.map