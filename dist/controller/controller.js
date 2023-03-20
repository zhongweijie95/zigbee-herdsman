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
const events_1 = __importDefault(require("events"));
const database_1 = __importDefault(require("./database"));
const adapter_1 = require("../adapter");
const model_1 = require("./model");
const helpers_1 = require("./helpers");
const Events = __importStar(require("./events"));
const tstype_1 = require("./tstype");
const debug_1 = __importDefault(require("debug"));
const fs_1 = __importDefault(require("fs"));
const zcl_1 = require("../zcl");
const touchlink_1 = __importDefault(require("./touchlink"));
const greenPower_1 = __importDefault(require("./greenPower"));
const utils_1 = require("../utils");
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const mixin_deep_1 = __importDefault(require("mixin-deep"));
const group_1 = __importDefault(require("./model/group"));
const DefaultOptions = {
    network: {
        networkKeyDistribute: false,
        networkKey: [0x01, 0x03, 0x05, 0x07, 0x09, 0x0B, 0x0D, 0x0F, 0x00, 0x02, 0x04, 0x06, 0x08, 0x0A, 0x0C, 0x0D],
        panID: 0x1a62,
        extendedPanID: [0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD, 0xDD],
        channelList: [11],
    },
    serialPort: {},
    databasePath: null,
    databaseBackupPath: null,
    backupPath: null,
    adapter: { disableLED: false },
    acceptJoiningDeviceHandler: null,
};
const debug = {
    error: debug_1.default('zigbee-herdsman:controller:error'),
    log: debug_1.default('zigbee-herdsman:controller:log'),
};
/**
 * @noInheritDoc
 */
class Controller extends events_1.default.EventEmitter {
    /**
     * Create a controller
     *
     * To auto detect the port provide `null` for `options.serialPort.path`
     */
    constructor(options, logger) {
        super();
        this.stopping = false;
        this.options = mixin_deep_1.default(JSON.parse(JSON.stringify(DefaultOptions)), options);
        this.logger = logger;
        // Validate options
        for (const channel of this.options.network.channelList) {
            if (channel < 11 || channel > 26) {
                throw new Error(`'${channel}' is an invalid channel, use a channel between 11 - 26.`);
            }
        }
        if (!Array.isArray(this.options.network.networkKey) || this.options.network.networkKey.length !== 16) {
            throw new Error(`Network key must be 16 digits long, got ${this.options.network.networkKey.length}.`);
        }
        if (!Array.isArray(this.options.network.extendedPanID) || this.options.network.extendedPanID.length !== 8) {
            throw new Error(`ExtendedPanID must be 8 digits long, got ${this.options.network.extendedPanID.length}.`);
        }
        if (this.options.network.panID >= 0xFFFF || this.options.network.panID <= 0) {
            throw new Error(`PanID must have a value of 0x0001 (1) - 0xFFFE (65534), ` +
                `got ${this.options.network.panID}.`);
        }
    }
    /**
     * Start the Herdsman controller
     */
    async start() {
        // Database (create end inject)
        this.database = database_1.default.open(this.options.databasePath);
        model_1.Entity.injectDatabase(this.database);
        // Adapter (create and inject)
        this.adapter = await adapter_1.Adapter.create(this.options.network, this.options.serialPort, this.options.backupPath, this.options.adapter, this.logger);
        debug.log(`Starting with options '${JSON.stringify(this.options)}'`);
        const startResult = await this.adapter.start();
        debug.log(`Started with result '${startResult}'`);
        model_1.Entity.injectAdapter(this.adapter);
        // log injection
        debug.log(`Injected database: ${this.database != null}, adapter: ${this.adapter != null}`);
        this.greenPower = new greenPower_1.default(this.adapter);
        this.greenPower.on(tstype_1.GreenPowerEvents.deviceJoined, this.onDeviceJoinedGreenPower.bind(this));
        // Register adapter events
        this.adapter.on(adapter_1.Events.Events.deviceJoined, this.onDeviceJoined.bind(this));
        this.adapter.on(adapter_1.Events.Events.zclData, (data) => this.onZclOrRawData('zcl', data));
        this.adapter.on(adapter_1.Events.Events.rawData, (data) => this.onZclOrRawData('raw', data));
        this.adapter.on(adapter_1.Events.Events.disconnected, this.onAdapterDisconnected.bind(this));
        this.adapter.on(adapter_1.Events.Events.deviceAnnounce, this.onDeviceAnnounce.bind(this));
        this.adapter.on(adapter_1.Events.Events.deviceLeave, this.onDeviceLeave.bind(this));
        this.adapter.on(adapter_1.Events.Events.networkAddress, this.onNetworkAddress.bind(this));
        if (startResult === 'reset') {
            if (this.options.databaseBackupPath && fs_1.default.existsSync(this.options.databasePath)) {
                fs_1.default.copyFileSync(this.options.databasePath, this.options.databaseBackupPath);
            }
            debug.log('Clearing database...');
            for (const group of group_1.default.all()) {
                group.removeFromDatabase();
            }
            for (const device of model_1.Device.all()) {
                device.removeFromDatabase();
            }
        }
        if (startResult === 'reset' || (this.options.backupPath && !fs_1.default.existsSync(this.options.backupPath))) {
            await this.backup();
        }
        // Add coordinator to the database if it is not there yet.
        const coordinator = await this.adapter.getCoordinator();
        if (model_1.Device.byType('Coordinator').length === 0) {
            debug.log('No coordinator in database, querying...');
            model_1.Device.create('Coordinator', coordinator.ieeeAddr, coordinator.networkAddress, coordinator.manufacturerID, undefined, undefined, undefined, true, coordinator.endpoints);
        }
        // Update coordinator ieeeAddr if changed, can happen due to e.g. reflashing
        const databaseCoordinator = model_1.Device.byType('Coordinator')[0];
        if (databaseCoordinator.ieeeAddr !== coordinator.ieeeAddr) {
            debug.log(`Coordinator address changed, updating to '${coordinator.ieeeAddr}'`);
            databaseCoordinator.changeIeeeAddress(coordinator.ieeeAddr);
        }
        // Set backup timer to 1 day.
        this.backupTimer = setInterval(() => this.backup(), 86400000);
        // Set database save timer to 1 hour.
        this.databaseSaveTimer = setInterval(() => this.databaseSave(), 3600000);
        this.touchlink = new touchlink_1.default(this.adapter);
        return startResult;
    }
    async touchlinkIdentify(ieeeAddr, channel) {
        await this.touchlink.identify(ieeeAddr, channel);
    }
    async touchlinkScan() {
        return this.touchlink.scan();
    }
    async touchlinkFactoryReset(ieeeAddr, channel) {
        return this.touchlink.factoryReset(ieeeAddr, channel);
    }
    async touchlinkFactoryResetFirst() {
        return this.touchlink.factoryResetFirst();
    }
    async permitJoin(permit, device, time) {
        await this.permitJoinInternal(permit, 'manual', device, time);
    }
    async permitJoinInternal(permit, reason, device, time) {
        clearInterval(this.permitJoinNetworkClosedTimer);
        clearInterval(this.permitJoinTimeoutTimer);
        this.permitJoinNetworkClosedTimer = null;
        this.permitJoinTimeoutTimer = null;
        this.permitJoinTimeout = undefined;
        if (permit) {
            await this.adapter.permitJoin(254, !device ? null : device.networkAddress);
            await this.greenPower.permitJoin(254, !device ? null : device.networkAddress);
            // Zigbee 3 networks automatically close after max 255 seconds, keep network open.
            this.permitJoinNetworkClosedTimer = setInterval(async () => {
                await this.adapter.permitJoin(254, !device ? null : device.networkAddress);
                await this.greenPower.permitJoin(254, !device ? null : device.networkAddress);
            }, 200 * 1000);
            if (typeof time === 'number') {
                this.permitJoinTimeout = time;
                this.permitJoinTimeoutTimer = setInterval(async () => {
                    this.permitJoinTimeout--;
                    if (this.permitJoinTimeout <= 0) {
                        await this.permitJoinInternal(false, 'timer_expired');
                    }
                    else {
                        const data = { permitted: true, timeout: this.permitJoinTimeout, reason };
                        this.emit(Events.Events.permitJoinChanged, data);
                    }
                }, 1000);
            }
            const data = { permitted: true, reason, timeout: this.permitJoinTimeout };
            this.emit(Events.Events.permitJoinChanged, data);
        }
        else {
            debug.log('Disable joining');
            await this.greenPower.permitJoin(0, null);
            await this.adapter.permitJoin(0, null);
            const data = { permitted: false, reason, timeout: this.permitJoinTimeout };
            this.emit(Events.Events.permitJoinChanged, data);
        }
    }
    getPermitJoin() {
        return this.permitJoinNetworkClosedTimer != null;
    }
    getPermitJoinTimeout() {
        return this.permitJoinTimeout;
    }
    isStopping() {
        return this.stopping;
    }
    async stop() {
        this.stopping = true;
        this.databaseSave();
        // Unregister adapter events
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceJoined);
        this.adapter.removeAllListeners(adapter_1.Events.Events.zclData);
        this.adapter.removeAllListeners(adapter_1.Events.Events.rawData);
        this.adapter.removeAllListeners(adapter_1.Events.Events.disconnected);
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceAnnounce);
        this.adapter.removeAllListeners(adapter_1.Events.Events.deviceLeave);
        try {
            await this.permitJoinInternal(false, 'manual');
        }
        catch (e) { }
        clearInterval(this.backupTimer);
        clearInterval(this.databaseSaveTimer);
        await this.backup();
        await this.adapter.stop();
    }
    databaseSave() {
        for (const device of model_1.Device.all()) {
            device.save(false);
        }
        for (const group of group_1.default.all()) {
            group.save(false);
        }
        this.database.write();
    }
    async backup() {
        if (this.options.backupPath && await this.adapter.supportsBackup()) {
            debug.log('Creating coordinator backup');
            const backup = await this.adapter.backup();
            const unifiedBackup = await utils_1.BackupUtils.toUnifiedBackup(backup);
            const tmpBackupPath = this.options.backupPath + '.tmp';
            fs_1.default.writeFileSync(tmpBackupPath, JSON.stringify(unifiedBackup, null, 2));
            fs_1.default.renameSync(tmpBackupPath, this.options.backupPath);
            debug.log(`Wrote coordinator backup to '${this.options.backupPath}'`);
        }
    }
    async reset(type) {
        await this.adapter.reset(type);
    }
    async getCoordinatorVersion() {
        return this.adapter.getCoordinatorVersion();
    }
    async getNetworkParameters() {
        // Cache network parameters as they don't change anymore after start.
        if (!this.networkParametersCached) {
            this.networkParametersCached = await this.adapter.getNetworkParameters();
        }
        return this.networkParametersCached;
    }
    /**
     * Get all devices
     */
    getDevices() {
        return model_1.Device.all();
    }
    /**
     * Get all devices with a specific type
     */
    getDevicesByType(type) {
        return model_1.Device.byType(type);
    }
    /**
     * Get device by ieeeAddr
     */
    getDeviceByIeeeAddr(ieeeAddr) {
        return model_1.Device.byIeeeAddr(ieeeAddr);
    }
    /**
     * Get device by networkAddress
     */
    getDeviceByNetworkAddress(networkAddress) {
        return model_1.Device.byNetworkAddress(networkAddress);
    }
    /**
     * Get group by ID
     */
    getGroupByID(groupID) {
        return group_1.default.byGroupID(groupID);
    }
    /**
     * Get all groups
     */
    getGroups() {
        return group_1.default.all();
    }
    /**
     * Create a Group
     */
    createGroup(groupID) {
        return group_1.default.create(groupID);
    }
    /**
     *  Set transmit power of the adapter
     */
    async setTransmitPower(value) {
        return this.adapter.setTransmitPower(value);
    }
    onNetworkAddress(payload) {
        debug.log(`Network address '${payload.ieeeAddr}'`);
        const device = model_1.Device.byIeeeAddr(payload.ieeeAddr);
        if (!device) {
            debug.log(`Network address is from unknown device '${payload.ieeeAddr}'`);
            return;
        }
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'networkAddress' });
        if (device.networkAddress !== payload.networkAddress) {
            debug.log(`Device '${payload.ieeeAddr}' got new networkAddress '${payload.networkAddress}'`);
            device.networkAddress = payload.networkAddress;
            device.save();
            const data = { device };
            this.selfAndDeviceEmit(device, Events.Events.deviceNetworkAddressChanged, data);
        }
    }
    onDeviceAnnounce(payload) {
        debug.log(`Device announce '${payload.ieeeAddr}'`);
        const device = model_1.Device.byIeeeAddr(payload.ieeeAddr);
        if (!device) {
            debug.log(`Device announce is from unknown device '${payload.ieeeAddr}'`);
            return;
        }
        device.updateLastSeen();
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'deviceAnnounce' });
        device.implicitCheckin();
        if (device.networkAddress !== payload.networkAddress) {
            debug.log(`Device '${payload.ieeeAddr}' announced with new networkAddress '${payload.networkAddress}'`);
            device.networkAddress = payload.networkAddress;
            device.save();
        }
        const data = { device };
        this.selfAndDeviceEmit(device, Events.Events.deviceAnnounce, data);
    }
    onDeviceLeave(payload) {
        debug.log(`Device leave '${payload.ieeeAddr}'`);
        const device = model_1.Device.byIeeeAddr(payload.ieeeAddr);
        if (device) {
            debug.log(`Removing device from database '${payload.ieeeAddr}'`);
            device.removeFromDatabase();
        }
        const data = { ieeeAddr: payload.ieeeAddr };
        this.selfAndDeviceEmit(device, Events.Events.deviceLeave, data);
    }
    async onAdapterDisconnected() {
        debug.log(`Adapter disconnected'`);
        try {
            await this.adapter.stop();
        }
        catch (error) {
        }
        this.emit(Events.Events.adapterDisconnected);
    }
    async onDeviceJoinedGreenPower(payload) {
        debug.log(`Green power device '${JSON.stringify(payload)}' joined`);
        // Green power devices don't have an ieeeAddr, the sourceID is unique and static so use this.
        let ieeeAddr = payload.sourceID.toString(16);
        ieeeAddr = `0x${'0'.repeat(16 - ieeeAddr.length)}${ieeeAddr}`;
        // Green power devices dont' have a modelID, create a modelID based on the deviceID (=type)
        const modelID = `GreenPower_${payload.deviceID}`;
        let device = model_1.Device.byIeeeAddr(ieeeAddr);
        if (!device) {
            debug.log(`New green power device '${ieeeAddr}' joined`);
            debug.log(`Creating device '${ieeeAddr}'`);
            device = model_1.Device.create('GreenPower', ieeeAddr, payload.networkAddress, null, undefined, undefined, modelID, true, []);
            device.save();
            const deviceJoinedPayload = { device };
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, deviceJoinedPayload);
            const deviceInterviewPayload = { status: 'successful', device };
            this.selfAndDeviceEmit(device, Events.Events.deviceInterview, deviceInterviewPayload);
        }
    }
    selfAndDeviceEmit(device, event, data) {
        device === null || device === void 0 ? void 0 : device.emit(event, data);
        this.emit(event, data);
    }
    async onDeviceJoined(payload) {
        debug.log(`Device '${payload.ieeeAddr}' joined`);
        if (this.options.acceptJoiningDeviceHandler) {
            if (!(await this.options.acceptJoiningDeviceHandler(payload.ieeeAddr))) {
                debug.log(`Device '${payload.ieeeAddr}' rejected by handler, removing it`);
                await this.adapter.removeDevice(payload.networkAddress, payload.ieeeAddr);
                return;
            }
            else {
                debug.log(`Device '${payload.ieeeAddr}' accepted by handler`);
            }
        }
        let device = model_1.Device.byIeeeAddr(payload.ieeeAddr, true);
        if (!device) {
            debug.log(`New device '${payload.ieeeAddr}' joined`);
            debug.log(`Creating device '${payload.ieeeAddr}'`);
            device = model_1.Device.create('Unknown', payload.ieeeAddr, payload.networkAddress, undefined, undefined, undefined, undefined, false, []);
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
        }
        else if (device.isDeleted) {
            debug.log(`Delete device '${payload.ieeeAddr}' joined, undeleting`);
            device.undelete();
            this.selfAndDeviceEmit(device, Events.Events.deviceJoined, { device });
        }
        if (device.networkAddress !== payload.networkAddress) {
            debug.log(`Device '${payload.ieeeAddr}' is already in database with different networkAddress, ` +
                `updating networkAddress`);
            device.networkAddress = payload.networkAddress;
            device.save();
        }
        device.updateLastSeen();
        this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'deviceJoined' });
        device.implicitCheckin();
        if (!device.interviewCompleted && !device.interviewing) {
            const payloadStart = { status: 'started', device };
            debug.log(`Interview '${device.ieeeAddr}' start`);
            this.selfAndDeviceEmit(device, Events.Events.deviceInterview, payloadStart);
            try {
                await device.interview();
                debug.log(`Succesfully interviewed '${device.ieeeAddr}'`);
                const event = { status: 'successful', device };
                this.selfAndDeviceEmit(device, Events.Events.deviceInterview, event);
            }
            catch (error) {
                debug.error(`Interview failed for '${device.ieeeAddr} with error '${error}'`);
                const event = { status: 'failed', device };
                this.selfAndDeviceEmit(device, Events.Events.deviceInterview, event);
            }
        }
        else {
            debug.log(`Not interviewing '${payload.ieeeAddr}', completed '${device.interviewCompleted}', ` +
                `in progress '${device.interviewing}'`);
        }
    }
    isZclDataPayload(dataPayload, type) {
        return type === 'zcl';
    }
    async onZclOrRawData(dataType, dataPayload) {
        const logDataPayload = JSON.parse(JSON.stringify(dataPayload));
        if (dataType === 'zcl') {
            delete logDataPayload.frame.Cluster;
        }
        debug.log(`Received '${dataType}' data '${JSON.stringify(logDataPayload)}'`);
        let gpDevice = null;
        if (this.isZclDataPayload(dataPayload, dataType)) {
            if (dataPayload.frame.Cluster.name === 'touchlink') {
                // This is handled by touchlink
                return;
            }
            else if (dataPayload.frame.Cluster.name === 'greenPower') {
                this.greenPower.onZclGreenPowerData(dataPayload);
                // lookup encapsulated gpDevice for further processing
                gpDevice = model_1.Device.byNetworkAddress(dataPayload.frame.Payload.srcID & 0xFFFF);
            }
        }
        let device = gpDevice ? gpDevice : (typeof dataPayload.address === 'string' ?
            model_1.Device.byIeeeAddr(dataPayload.address) : model_1.Device.byNetworkAddress(dataPayload.address));
        /**
         * Handling of re-transmitted Xiaomi messages.
         * https://github.com/Koenkk/zigbee2mqtt/issues/1238
         * https://github.com/Koenkk/zigbee2mqtt/issues/3592
         *
         * Some Xiaomi router devices re-transmit messages from Xiaomi end devices.
         * The network address of these message is set to the one of the Xiaomi router.
         * Therefore it looks like if the message came from the Xiaomi router, while in
         * fact it came from the end device.
         * Handling these message would result in false state updates.
         * The group ID attribute of these message defines the network address of the end device.
         */
        if ((device === null || device === void 0 ? void 0 : device.manufacturerName) === 'LUMI' && (device === null || device === void 0 ? void 0 : device.type) == 'Router' && dataPayload.groupID) {
            debug.log(`Handling re-transmitted Xiaomi message ${device.networkAddress} -> ${dataPayload.groupID}`);
            device = model_1.Device.byNetworkAddress(dataPayload.groupID);
        }
        if (!device) {
            debug.log(`'${dataType}' data is from unknown device with address '${dataPayload.address}', ` +
                `skipping...`);
            return;
        }
        device.updateLastSeen();
        device.implicitCheckin();
        device.linkquality = dataPayload.linkquality;
        let endpoint = device.getEndpoint(dataPayload.endpoint);
        if (!endpoint) {
            debug.log(`'${dataType}' data is from unknown endpoint '${dataPayload.endpoint}' from device with ` +
                `network address '${dataPayload.address}', creating it...`);
            endpoint = device.createEndpoint(dataPayload.endpoint);
        }
        // Parse command for event
        let type = undefined;
        let data;
        let clusterName = undefined;
        const meta = {};
        if (this.isZclDataPayload(dataPayload, dataType)) {
            const frame = dataPayload.frame;
            const command = frame.getCommand();
            clusterName = frame.Cluster.name;
            meta.zclTransactionSequenceNumber = frame.Header.transactionSequenceNumber;
            meta.manufacturerCode = frame.Header.manufacturerCode;
            meta.frameControl = frame.Header.frameControl;
            if (frame.isGlobal()) {
                if (frame.isCommand('report')) {
                    type = 'attributeReport';
                    data = helpers_1.ZclFrameConverter.attributeKeyValue(dataPayload.frame);
                }
                else if (frame.isCommand('read')) {
                    type = 'read';
                    data = helpers_1.ZclFrameConverter.attributeList(dataPayload.frame);
                }
                else if (frame.isCommand('write')) {
                    type = 'write';
                    data = helpers_1.ZclFrameConverter.attributeKeyValue(dataPayload.frame);
                }
                else {
                    /* istanbul ignore else */
                    if (frame.isCommand('readRsp')) {
                        type = 'readResponse';
                        data = helpers_1.ZclFrameConverter.attributeKeyValue(dataPayload.frame);
                    }
                }
            }
            else {
                /* istanbul ignore else */
                if (frame.isSpecific()) {
                    if (Events.CommandsLookup[command.name]) {
                        type = Events.CommandsLookup[command.name];
                        data = dataPayload.frame.Payload;
                    }
                    else {
                        debug.log(`Skipping command '${command.name}' because it is missing from the lookup`);
                    }
                }
            }
            if (type === 'readResponse' || type === 'attributeReport') {
                // Some device report, e.g. it's modelID through a readResponse or attributeReport
                for (const [key, value] of Object.entries(data)) {
                    const property = model_1.Device.ReportablePropertiesMapping[key];
                    if (property && !device[property.key]) {
                        property.set(value, device);
                    }
                }
                endpoint.saveClusterAttributeKeyValue(frame.Cluster.ID, data);
            }
        }
        else {
            type = 'raw';
            data = dataPayload.data;
            const name = zcl_1.Utils.getCluster(dataPayload.clusterID).name;
            clusterName = Number.isNaN(Number(name)) ? name : Number(name);
        }
        if (type && data) {
            const endpoint = device.getEndpoint(dataPayload.endpoint);
            const linkquality = dataPayload.linkquality;
            const groupID = dataPayload.groupID;
            const eventData = {
                type: type, device, endpoint, data, linkquality, groupID, cluster: clusterName, meta
            };
            this.selfAndDeviceEmit(device, Events.Events.message, eventData);
            this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'messageEmitted' });
        }
        else {
            this.selfAndDeviceEmit(device, Events.Events.lastSeenChanged, { device, reason: 'messageNonEmitted' });
        }
        if (this.isZclDataPayload(dataPayload, dataType)) {
            device.onZclData(dataPayload, endpoint);
        }
    }
}
exports.default = Controller;
//# sourceMappingURL=controller.js.map