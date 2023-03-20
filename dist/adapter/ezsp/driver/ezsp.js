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
exports.Ezsp = void 0;
/* istanbul ignore file */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
const t = __importStar(require("./types"));
const uart_1 = require("./uart");
const commands_1 = require("./commands");
const named_1 = require("./types/named");
const events_1 = require("events");
const utils_1 = require("../../../utils");
const debug_1 = __importDefault(require("debug"));
const debug = {
    error: debug_1.default('zigbee-herdsman:adapter:ezsp:error'),
    log: debug_1.default('zigbee-herdsman:adapter:ezsp:log'),
};
const MTOR_MIN_INTERVAL = 10;
const MTOR_MAX_INTERVAL = 90;
const MTOR_ROUTE_ERROR_THRESHOLD = 4;
const MTOR_DELIVERY_FAIL_THRESHOLD = 3;
const MAX_WATCHDOG_FAILURES = 4;
//const RESET_ATTEMPT_BACKOFF_TIME = 5;
const WATCHDOG_WAKE_PERIOD = 10; // in sec
//const EZSP_COUNTER_CLEAR_INTERVAL = 180;  // Clear counters every n * WATCHDOG_WAKE_PERIOD
const EZSP_DEFAULT_RADIUS = 0;
const EZSP_MULTICAST_NON_MEMBER_RADIUS = 3;
class Ezsp extends events_1.EventEmitter {
    constructor() {
        super();
        this.ezspV = 4;
        this.cmdSeq = 0; // command sequence
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        this.COMMANDS_BY_ID = new Map();
        this.failures = 0;
        for (const name in commands_1.COMMANDS) {
            const details = commands_1.COMMANDS[name];
            this.COMMANDS_BY_ID.set(details[0], { name, inArgs: details[1], outArgs: details[2] });
        }
        this.queue = new utils_1.Queue();
        this.waitress = new utils_1.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
        this.serialDriver = new uart_1.SerialDriver();
        this.serialDriver.on('received', this.onFrameReceived.bind(this));
    }
    async connect(path, options) {
        await this.serialDriver.connect(path, options);
        this.watchdogTimer = setInterval(this.watchdogHandler.bind(this), WATCHDOG_WAKE_PERIOD * 1000);
    }
    async close() {
        debug.log('Stop ezsp');
        clearTimeout(this.watchdogTimer);
        await this.serialDriver.close();
    }
    onFrameReceived(data) {
        /*Handle a received EZSP frame

        The protocol has taken care of UART specific framing etc, so we should
        just have EZSP application stuff here, with all escaping/stuffing and
        data randomization removed.
        */
        debug.log(`<=== Frame: ${data.toString('hex')}`);
        let frame_id, result, sequence;
        if ((this.ezspV < 8)) {
            [sequence, frame_id, data] = [data[0], data[2], data.slice(3)];
        }
        else {
            sequence = data[0];
            [[frame_id], data] = t.deserialize(data.slice(3), [t.uint16_t]);
        }
        if ((frame_id === 255)) {
            frame_id = 0;
            if ((data.length > 1)) {
                frame_id = data[1];
                data = data.slice(2);
            }
        }
        const cmd = this.COMMANDS_BY_ID.get(frame_id);
        if (!cmd)
            throw new Error('Unrecognized command from FrameID' + frame_id);
        const frameName = cmd.name;
        debug.log("<=== Application frame %s (%s) received: %s", frame_id, frameName, data.toString('hex'));
        const schema = cmd.outArgs;
        [result, data] = t.deserialize(data, schema);
        debug.log(`<=== Application frame ${frame_id} (${frameName})   parsed: ${result}`);
        const handled = this.waitress.resolve({
            frameId: frame_id,
            frameName: frameName,
            sequence: sequence,
            payload: result
        });
        if (!handled)
            this.emit('frame', frameName, ...result);
        if ((frame_id === 0)) {
            this.ezspV = result[0];
        }
    }
    async version() {
        const version = this.ezspV;
        const result = await this.command("version", version);
        if ((result[0] !== version)) {
            debug.log("Switching to eszp version %d", result[0]);
            await this.command("version", result[0]);
        }
        return result[0];
    }
    async networkInit() {
        const waiter = this.waitFor(commands_1.COMMANDS["stackStatusHandler"][0], null).start();
        const [result] = await this.command("networkInit");
        debug.log('network init result', result);
        if ((result !== named_1.EmberStatus.SUCCESS)) {
            this.waitress.remove(waiter.ID);
            debug.log("Failure to init network:" + result);
            return false;
        }
        const response = await waiter.promise;
        return response.payload[0] == named_1.EmberStatus.NETWORK_UP;
    }
    async leaveNetwork() {
        const waiter = this.waitFor(commands_1.COMMANDS["stackStatusHandler"][0], null).start();
        const [result] = await this.command("leaveNetwork");
        debug.log('network init result', result);
        if ((result !== named_1.EmberStatus.SUCCESS)) {
            this.waitress.remove(waiter.ID);
            debug.log("Failure to leave network:" + result);
            throw new Error(("Failure to leave network:" + result));
        }
        const response = await waiter.promise;
        if ((response.payload[0] !== named_1.EmberStatus.NETWORK_DOWN)) {
            debug.log("Wrong network status:" + response.payload);
            throw new Error(("Wrong network status:" + response.payload));
        }
        return response.payload[0];
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async setConfigurationValue(configId, value) {
        debug.log('Set %s = %s', named_1.EzspConfigId.valueToName(named_1.EzspConfigId, configId), value);
        const [ret] = await this.execCommand('setConfigurationValue', configId, value);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (setConfigurationValue) returned unexpected state: ${ret}`);
    }
    async getConfigurationValue(configId) {
        debug.log('Get %s', named_1.EzspConfigId.valueToName(named_1.EzspConfigId, configId));
        const [ret, value] = await this.execCommand('getConfigurationValue', configId);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (getConfigurationValue) returned unexpected state: ${ret}`);
        debug.log('Got %s = %s', named_1.EzspConfigId.valueToName(named_1.EzspConfigId, configId), value);
        return value;
    }
    async getMulticastTableEntry(index) {
        const [value] = await this.execCommand('getMulticastTableEntry', index);
        //console.assert(ret === EmberStatus.SUCCESS);
        return value;
    }
    async setMulticastTableEntry(index, entry) {
        const [ret] = await this.execCommand('setMulticastTableEntry', index, entry);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (setMulticastTableEntry) returned unexpected state: ${ret}`);
        return [ret];
    }
    async setInitialSecurityState(entry) {
        const [ret] = await this.execCommand('setInitialSecurityState', entry);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (setInitialSecurityState) returned unexpected state: ${ret}`);
        return [ret];
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async getCurrentSecurityState() {
        const [ret, res] = await this.execCommand('getCurrentSecurityState');
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (getCurrentSecurityState) returned unexpected state: ${ret}`);
        return [ret, res];
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async setValue(valueId, value) {
        debug.log('Set %s = %s', t.EzspValueId.valueToName(t.EzspValueId, valueId), value);
        const [ret] = await this.execCommand('setValue', valueId, value);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (setValue) returned unexpected state: ${ret}`);
        return [ret];
    }
    async getValue(valueId) {
        debug.log('Get %s', t.EzspValueId.valueToName(t.EzspValueId, valueId));
        const [ret, value] = await this.execCommand('getValue', valueId);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (getValue) returned unexpected state: ${ret}`);
        debug.log('Got %s = %s', t.EzspValueId.valueToName(t.EzspValueId, valueId), value);
        return value;
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async setPolicy(policyId, value) {
        debug.log('Set %s = %s', named_1.EzspPolicyId.valueToName(named_1.EzspPolicyId, policyId), value);
        const [ret] = await this.execCommand('setPolicy', policyId, value);
        console.assert(ret === named_1.EmberStatus.SUCCESS, `Command (setPolicy) returned unexpected state: ${ret}`);
        return [ret];
    }
    async updateConfig() {
        const config = [
            [named_1.EzspConfigId.CONFIG_FRAGMENT_DELAY_MS, 50],
            [named_1.EzspConfigId.CONFIG_TX_POWER_MODE, 3],
            [named_1.EzspConfigId.CONFIG_FRAGMENT_WINDOW_SIZE, 1],
            //[EzspConfigId.CONFIG_BEACON_JITTER_DURATION, 0],
            [named_1.EzspConfigId.CONFIG_NEIGHBOR_TABLE_SIZE, 16],
            [named_1.EzspConfigId.CONFIG_ROUTE_TABLE_SIZE, 16],
            [named_1.EzspConfigId.CONFIG_BINDING_TABLE_SIZE, 32],
            [named_1.EzspConfigId.CONFIG_KEY_TABLE_SIZE, 12],
            [named_1.EzspConfigId.CONFIG_ZLL_GROUP_ADDRESSES, 0],
            [named_1.EzspConfigId.CONFIG_ZLL_RSSI_THRESHOLD, 215],
            [named_1.EzspConfigId.CONFIG_TRANSIENT_KEY_TIMEOUT_S, 300],
            //[EzspConfigId.CONFIG_APS_UNICAST_MESSAGE_COUNT, 255],
            [named_1.EzspConfigId.CONFIG_BROADCAST_TABLE_SIZE, 15],
            [named_1.EzspConfigId.CONFIG_MAX_HOPS, 30],
            [named_1.EzspConfigId.CONFIG_INDIRECT_TRANSMISSION_TIMEOUT, 7680],
            [named_1.EzspConfigId.CONFIG_SOURCE_ROUTE_TABLE_SIZE, 16],
            [named_1.EzspConfigId.CONFIG_MULTICAST_TABLE_SIZE, 16],
            [named_1.EzspConfigId.CONFIG_ADDRESS_TABLE_SIZE, 16],
            [named_1.EzspConfigId.CONFIG_TRUST_CENTER_ADDRESS_CACHE_SIZE, 2],
            [named_1.EzspConfigId.CONFIG_SUPPORTED_NETWORKS, 1],
            [named_1.EzspConfigId.CONFIG_TC_REJOINS_USING_WELL_KNOWN_KEY_TIMEOUT_S, 90],
            [named_1.EzspConfigId.CONFIG_APPLICATION_ZDO_FLAGS,
                named_1.EmberZdoConfigurationFlags.APP_RECEIVES_SUPPORTED_ZDO_REQUESTS
                    | named_1.EmberZdoConfigurationFlags.APP_HANDLES_UNSUPPORTED_ZDO_REQUESTS],
            [named_1.EzspConfigId.CONFIG_SECURITY_LEVEL, 5],
            [named_1.EzspConfigId.CONFIG_END_DEVICE_POLL_TIMEOUT, 8],
            [named_1.EzspConfigId.CONFIG_PAN_ID_CONFLICT_REPORT_THRESHOLD, 2],
            [named_1.EzspConfigId.CONFIG_MAX_END_DEVICE_CHILDREN, 32],
            [named_1.EzspConfigId.CONFIG_STACK_PROFILE, 2],
            [named_1.EzspConfigId.CONFIG_PACKET_BUFFER_COUNT, 255],
        ];
        for (const [confName, value] of config) {
            await this.setConfigurationValue(confName, value);
        }
    }
    async updatePolicies() {
        // Set up the policies for what the NCP should do.
        const policies = [
            [named_1.EzspPolicyId.BINDING_MODIFICATION_POLICY,
                named_1.EzspDecisionId.CHECK_BINDING_MODIFICATIONS_ARE_VALID_ENDPOINT_CLUSTERS],
            [named_1.EzspPolicyId.UNICAST_REPLIES_POLICY, named_1.EzspDecisionId.HOST_WILL_NOT_SUPPLY_REPLY],
            [named_1.EzspPolicyId.POLL_HANDLER_POLICY, named_1.EzspDecisionId.POLL_HANDLER_IGNORE],
            [named_1.EzspPolicyId.MESSAGE_CONTENTS_IN_CALLBACK_POLICY,
                named_1.EzspDecisionId.MESSAGE_TAG_ONLY_IN_CALLBACK],
            [named_1.EzspPolicyId.PACKET_VALIDATE_LIBRARY_POLICY,
                named_1.EzspDecisionId.PACKET_VALIDATE_LIBRARY_CHECKS_DISABLED],
            [named_1.EzspPolicyId.ZLL_POLICY, named_1.EzspDecisionId.ALLOW_JOINS],
            [named_1.EzspPolicyId.TC_REJOINS_USING_WELL_KNOWN_KEY_POLICY, named_1.EzspDecisionId.ALLOW_JOINS],
            [named_1.EzspPolicyId.APP_KEY_REQUEST_POLICY, named_1.EzspDecisionId.DENY_APP_KEY_REQUESTS],
            [named_1.EzspPolicyId.TRUST_CENTER_POLICY, named_1.EzspDecisionBitmask.ALLOW_UNSECURED_REJOINS
                    | named_1.EzspDecisionBitmask.ALLOW_JOINS],
            [named_1.EzspPolicyId.TC_KEY_REQUEST_POLICY, named_1.EzspDecisionId.ALLOW_TC_KEY_REQUESTS],
        ];
        for (const [policy, value] of policies) {
            await this.setPolicy(policy, value);
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    makeZDOframe(name, ...args) {
        const c = commands_1.ZDO_COMMANDS[name];
        const data = t.serialize(args, c[1]);
        return data;
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    makeFrame(name, ...args) {
        const c = commands_1.COMMANDS[name];
        const data = t.serialize(args, c[1]);
        const frame = [(this.cmdSeq & 255)];
        if ((this.ezspV < 8)) {
            if ((this.ezspV >= 5)) {
                frame.push(0x00, 0xFF, 0x00, c[0]);
            }
            else {
                frame.push(0x00, c[0]);
            }
        }
        else {
            const cmd_id = t.serialize([c[0]], [t.uint16_t]);
            frame.push(0x00, 0x01, ...cmd_id);
        }
        return Buffer.concat([Buffer.from(frame), data]);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    command(name, ...args) {
        debug.log(`===> Send command ${name}: (${args})`);
        return this.queue.execute(async () => {
            const data = this.makeFrame(name, ...args);
            debug.log(`===> Send data    ${name}: (${data.toString('hex')})`);
            /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
            const c = commands_1.COMMANDS[name];
            const waiter = this.waitFor(c[0], this.cmdSeq).start();
            this.cmdSeq = (this.cmdSeq + 1) & 255;
            this.serialDriver.sendDATA(data);
            const response = await waiter.promise;
            return response.payload;
        });
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async formNetwork(...args) {
        const waiter = this.waitFor(commands_1.COMMANDS["stackStatusHandler"][0], null).start();
        const v = await this.command("formNetwork", ...args);
        if ((v[0] !== named_1.EmberStatus.SUCCESS)) {
            this.waitress.remove(waiter.ID);
            debug.error("Failure forming network:" + v);
            throw new Error(("Failure forming network:" + v));
        }
        const response = await waiter.promise;
        if ((response.payload[0] !== named_1.EmberStatus.NETWORK_UP)) {
            debug.error("Wrong network status:" + response.payload);
            throw new Error(("Wrong network status:" + response.payload));
        }
        return response.payload[0];
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    execCommand(name, ...args) {
        if (Object.keys(commands_1.COMMANDS).indexOf(name) < 0) {
            throw new Error('Unknown command: ' + name);
        }
        return this.command(name, ...args);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    parse_frame_payload(name, data) {
        if (Object.keys(commands_1.ZDO_COMMANDS).indexOf(name) < 0) {
            throw new Error('Unknown ZDO command: ' + name);
        }
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        const c = commands_1.ZDO_COMMANDS[name];
        const result = t.deserialize(data, c[1])[0];
        return result;
    }
    /* eslint-disable @typescript-eslint/no-explicit-any*/
    sendUnicast(direct, nwk, apsFrame, seq, data) {
        return this.execCommand('sendUnicast', direct, nwk, apsFrame, seq, data);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any*/
    /* eslint-disable @typescript-eslint/no-explicit-any*/
    sendMulticast(apsFrame, seq, data) {
        return this.execCommand('sendMulticast', apsFrame, EZSP_DEFAULT_RADIUS, EZSP_MULTICAST_NON_MEMBER_RADIUS, seq, data);
    }
    /* eslint-enable @typescript-eslint/no-explicit-any*/
    async setSourceRouting() {
        const [res] = await this.execCommand('setConcentrator', true, named_1.EmberConcentratorType.HIGH_RAM_CONCENTRATOR, MTOR_MIN_INTERVAL, MTOR_MAX_INTERVAL, MTOR_ROUTE_ERROR_THRESHOLD, MTOR_DELIVERY_FAIL_THRESHOLD, 0);
        debug.log("Set concentrator type: %s", res);
        if (res != named_1.EmberStatus.SUCCESS) {
            debug.log("Couldn't set concentrator type %s: %s", true, res);
        }
        // await this.execCommand('setSourceRouteDiscoveryMode', 1);
    }
    waitFor(frameId, sequence, timeout = 10000) {
        return this.waitress.waitFor({ frameId, sequence }, timeout);
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }
    waitressValidator(payload, matcher) {
        return ((matcher.sequence == null || payload.sequence === matcher.sequence) &&
            payload.frameId === matcher.frameId);
    }
    async watchdogHandler() {
        debug.log(`Time to watchdog ... ${this.failures}`);
        try {
            await this.execCommand('nop');
        }
        catch (error) {
            debug.error(`Watchdog heartbeat timeout ${error.stack}`);
            this.failures += 1;
            if (this.failures > MAX_WATCHDOG_FAILURES) {
                this.failures = 0;
                this.emit('reset');
            }
        }
    }
}
exports.Ezsp = Ezsp;
//# sourceMappingURL=ezsp.js.map