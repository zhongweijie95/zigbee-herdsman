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
const zclTransactionSequenceNumber_1 = __importDefault(require("../helpers/zclTransactionSequenceNumber"));
const endpoint_1 = __importDefault(require("./endpoint"));
const entity_1 = __importDefault(require("./entity"));
const utils_1 = require("../../utils");
const debug_1 = __importDefault(require("debug"));
const Zcl = __importStar(require("../../zcl"));
const assert_1 = __importDefault(require("assert"));
const helpers_1 = require("../helpers");
/**
 * @ignore
 */
const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
const debug = {
    error: debug_1.default('zigbee-herdsman:controller:device:error'),
    log: debug_1.default('zigbee-herdsman:controller:device:log'),
};
class Device extends entity_1.default {
    constructor(ID, type, ieeeAddr, networkAddress, manufacturerID, endpoints, manufacturerName, powerSource, modelID, applicationVersion, stackVersion, zclVersion, hardwareVersion, dateCode, softwareBuildID, interviewCompleted, meta, lastSeen, defaultSendRequestWhen) {
        super();
        this.ID = ID;
        this._type = type;
        this.ieeeAddr = ieeeAddr;
        this._networkAddress = networkAddress;
        this._manufacturerID = manufacturerID;
        this._endpoints = endpoints;
        this._manufacturerName = manufacturerName;
        this._powerSource = powerSource;
        this._modelID = modelID;
        this._applicationVersion = applicationVersion;
        this._stackVersion = stackVersion;
        this._zclVersion = zclVersion;
        this.hardwareVersion = hardwareVersion;
        this._dateCode = dateCode;
        this._softwareBuildID = softwareBuildID;
        this._interviewCompleted = interviewCompleted;
        this._interviewing = false;
        this._skipDefaultResponse = false;
        this._skipTimeResponse = false;
        this.meta = meta;
        this._lastSeen = lastSeen;
        this._defaultSendRequestWhen = defaultSendRequestWhen;
    }
    // Getters/setters
    get ieeeAddr() { return this._ieeeAddr; }
    set ieeeAddr(ieeeAddr) { this._ieeeAddr = ieeeAddr; }
    get applicationVersion() { return this._applicationVersion; }
    set applicationVersion(applicationVersion) { this._applicationVersion = applicationVersion; }
    get endpoints() { return this._endpoints; }
    get interviewCompleted() { return this._interviewCompleted; }
    get interviewing() { return this._interviewing; }
    get lastSeen() { return this._lastSeen; }
    get manufacturerID() { return this._manufacturerID; }
    get isDeleted() { return this._deleted; }
    set type(type) { this._type = type; }
    get type() { return this._type; }
    get dateCode() { return this._dateCode; }
    set dateCode(dateCode) { this._dateCode = dateCode; }
    set hardwareVersion(hardwareVersion) { this._hardwareVersion = hardwareVersion; }
    get hardwareVersion() { return this._hardwareVersion; }
    get manufacturerName() { return this._manufacturerName; }
    set manufacturerName(manufacturerName) { this._manufacturerName = manufacturerName; }
    set modelID(modelID) { this._modelID = modelID; }
    get modelID() { return this._modelID; }
    get networkAddress() { return this._networkAddress; }
    set networkAddress(networkAddress) {
        this._networkAddress = networkAddress;
        for (const endpoint of this._endpoints) {
            endpoint.deviceNetworkAddress = networkAddress;
        }
    }
    get powerSource() { return this._powerSource; }
    set powerSource(powerSource) {
        this._powerSource = typeof powerSource === 'number' ? Zcl.PowerSource[powerSource & ~(1 << 7)] : powerSource;
    }
    get softwareBuildID() { return this._softwareBuildID; }
    set softwareBuildID(softwareBuildID) { this._softwareBuildID = softwareBuildID; }
    get stackVersion() { return this._stackVersion; }
    set stackVersion(stackVersion) { this._stackVersion = stackVersion; }
    get zclVersion() { return this._zclVersion; }
    set zclVersion(zclVersion) { this._zclVersion = zclVersion; }
    get linkquality() { return this._linkquality; }
    set linkquality(linkquality) { this._linkquality = linkquality; }
    get skipDefaultResponse() { return this._skipDefaultResponse; }
    set skipDefaultResponse(skipDefaultResponse) { this._skipDefaultResponse = skipDefaultResponse; }
    get skipTimeResponse() { return this._skipTimeResponse; }
    set skipTimeResponse(skipTimeResponse) { this._skipTimeResponse = skipTimeResponse; }
    get defaultSendRequestWhen() { return this._defaultSendRequestWhen; }
    set defaultSendRequestWhen(defaultSendRequestWhen) {
        this._defaultSendRequestWhen = defaultSendRequestWhen;
    }
    createEndpoint(ID) {
        if (this.getEndpoint(ID)) {
            throw new Error(`Device '${this.ieeeAddr}' already has an endpoint '${ID}'`);
        }
        const endpoint = endpoint_1.default.create(ID, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr);
        this.endpoints.push(endpoint);
        this.save();
        return endpoint;
    }
    changeIeeeAddress(ieeeAddr) {
        delete Device.devices[this.ieeeAddr];
        this.ieeeAddr = ieeeAddr;
        Device.devices[this.ieeeAddr] = this;
        this.save();
    }
    getEndpoint(ID) {
        return this.endpoints.find((e) => e.ID === ID);
    }
    // There might be multiple endpoints with same DeviceId but it is not supported and first endpoint is returned
    getEndpointByDeviceType(deviceType) {
        const deviceID = Zcl.EndpointDeviceType[deviceType];
        return this.endpoints.find((d) => d.deviceID === deviceID);
    }
    implicitCheckin() {
        this.endpoints.forEach(async (e) => e.sendPendingRequests(false));
    }
    updateLastSeen() {
        this._lastSeen = Date.now();
    }
    hasPendingRequests() {
        return this.endpoints.find(e => e.hasPendingRequests()) !== undefined;
    }
    async onZclData(dataPayload, endpoint) {
        var _a;
        const frame = dataPayload.frame;
        // Update reportable properties
        if (frame.isCluster('genBasic') && (frame.isCommand('readRsp') || frame.isCommand('report'))) {
            for (const [key, value] of Object.entries(helpers_1.ZclFrameConverter.attributeKeyValue(frame))) {
                (_a = Device.ReportablePropertiesMapping[key]) === null || _a === void 0 ? void 0 : _a.set(value, this);
                this.save();
            }
        }
        // Respond to enroll requests
        if (frame.isSpecific() && frame.isCluster('ssIasZone') && frame.isCommand('enrollReq')) {
            debug.log(`IAS - '${this.ieeeAddr}' responding to enroll response`);
            const payload = { enrollrspcode: 0, zoneid: 23 };
            await endpoint.command('ssIasZone', 'enrollRsp', payload, { disableDefaultResponse: true });
        }
        // Reponse to read requests
        if (frame.isGlobal() && frame.isCommand('read')) {
            const time = Math.round(((new Date()).getTime() - OneJanuary2000) / 1000);
            const attributes = {
                ...endpoint.clusters,
                genTime: { attributes: {
                        timeStatus: 3,
                        time: time,
                        timeZone: ((new Date()).getTimezoneOffset() * -1) * 60,
                        localTime: time - (new Date()).getTimezoneOffset() * 60,
                    } },
            };
            if (frame.Cluster.name in attributes && (frame.Cluster.name !== 'genTime' || !this._skipTimeResponse)) {
                const response = {};
                for (const entry of frame.Payload) {
                    if (frame.Cluster.hasAttribute(entry.attrId)) {
                        const name = frame.Cluster.getAttribute(entry.attrId).name;
                        if (name in attributes[frame.Cluster.name].attributes) {
                            response[name] = attributes[frame.Cluster.name].attributes[name];
                        }
                    }
                }
                try {
                    await endpoint.readResponse(frame.Cluster.ID, frame.Header.transactionSequenceNumber, response, { srcEndpoint: dataPayload.destinationEndpoint });
                }
                catch (error) {
                    debug.error(`Read response to ${this.ieeeAddr} failed`);
                }
            }
        }
        // Handle check-in from sleeping end devices
        if (frame.isSpecific() && frame.isCluster("genPollCtrl") && frame.isCommand("checkin")) {
            try {
                if (this.hasPendingRequests()) {
                    const payload = {
                        startFastPolling: true,
                        fastPollTimeout: 0,
                    };
                    debug.log(`check-in from ${this.ieeeAddr}: accepting fast-poll`);
                    await endpoint.command(frame.Cluster.ID, 'checkinRsp', payload, { sendWhen: 'immediate' });
                    await Promise.all(this.endpoints.map(async (e) => e.sendPendingRequests(true)));
                    // We *must* end fast-poll when we're done sending things. Otherwise
                    // we cause undue power-drain.
                    debug.log(`check-in from ${this.ieeeAddr}: stopping fast-poll`);
                    await endpoint.command(frame.Cluster.ID, 'fastPollStop', {}, { sendWhen: 'immediate' });
                }
                else {
                    const payload = {
                        startFastPolling: false,
                        fastPollTimeout: 0,
                    };
                    debug.log(`check-in from ${this.ieeeAddr}: declining fast-poll`);
                    await endpoint.command(frame.Cluster.ID, 'checkinRsp', payload, { sendWhen: 'immediate' });
                }
            }
            catch (error) {
                /* istanbul ignore next */
                debug.error(`Handling of poll check-in form ${this.ieeeAddr} failed`);
            }
        }
        // Send a default response if necessary.
        const isDefaultResponse = frame.isGlobal() && frame.getCommand().name === 'defaultRsp';
        const commandHasResponse = frame.getCommand().hasOwnProperty('response');
        const disableDefaultResponse = frame.Header.frameControl.disableDefaultResponse;
        if (!dataPayload.wasBroadcast && !disableDefaultResponse && !isDefaultResponse && !commandHasResponse &&
            !this._skipDefaultResponse) {
            try {
                await endpoint.defaultResponse(frame.getCommand().ID, 0, frame.Cluster.ID, frame.Header.transactionSequenceNumber);
            }
            catch (error) {
                debug.error(`Default response to ${this.ieeeAddr} failed`);
            }
        }
    }
    /*
     * CRUD
     */
    static fromDatabaseEntry(entry) {
        const networkAddress = entry.nwkAddr;
        const ieeeAddr = entry.ieeeAddr;
        const endpoints = Object.values(entry.endpoints).map((e) => {
            return endpoint_1.default.fromDatabaseRecord(e, networkAddress, ieeeAddr);
        });
        const meta = entry.meta ? entry.meta : {};
        if (entry.type === 'Group') {
            throw new Error('Cannot load device from group');
        }
        let defaultSendRequestWhen = entry.defaultSendRequestWhen;
        /* istanbul ignore next */
        if (defaultSendRequestWhen == null) {
            // Guess defaultSendRequestWhen based on old useImplicitCheckin/defaultSendWhenActive
            if (entry.hasOwnProperty('useImplicitCheckin') && !entry.useImplicitCheckin) {
                defaultSendRequestWhen = 'fastpoll';
            }
            else if (entry.hasOwnProperty('defaultSendWhenActive') && entry.defaultSendWhenActive) {
                defaultSendRequestWhen = 'active';
            }
            else {
                defaultSendRequestWhen = 'immediate';
            }
        }
        return new Device(entry.id, entry.type, ieeeAddr, networkAddress, entry.manufId, endpoints, entry.manufName, entry.powerSource, entry.modelId, entry.appVersion, entry.stackVersion, entry.zclVersion, entry.hwVersion, entry.dateCode, entry.swBuildId, entry.interviewCompleted, meta, entry.lastSeen || null, defaultSendRequestWhen);
    }
    toDatabaseEntry() {
        const epList = this.endpoints.map((e) => e.ID);
        const endpoints = {};
        for (const endpoint of this.endpoints) {
            endpoints[endpoint.ID] = endpoint.toDatabaseRecord();
        }
        return {
            id: this.ID, type: this.type, ieeeAddr: this.ieeeAddr, nwkAddr: this.networkAddress,
            manufId: this.manufacturerID, manufName: this.manufacturerName, powerSource: this.powerSource,
            modelId: this.modelID, epList, endpoints, appVersion: this.applicationVersion,
            stackVersion: this.stackVersion, hwVersion: this.hardwareVersion, dateCode: this.dateCode,
            swBuildId: this.softwareBuildID, zclVersion: this.zclVersion, interviewCompleted: this.interviewCompleted,
            meta: this.meta, lastSeen: this.lastSeen, defaultSendRequestWhen: this.defaultSendRequestWhen,
        };
    }
    save(writeDatabase = true) {
        entity_1.default.database.update(this.toDatabaseEntry(), writeDatabase);
    }
    static loadFromDatabaseIfNecessary() {
        if (!Device.devices) {
            Device.devices = {};
            const entries = entity_1.default.database.getEntries(['Coordinator', 'EndDevice', 'Router', 'GreenPower', 'Unknown']);
            for (const entry of entries) {
                const device = Device.fromDatabaseEntry(entry);
                Device.devices[device.ieeeAddr] = device;
            }
        }
    }
    static byIeeeAddr(ieeeAddr, includeDeleted = false) {
        Device.loadFromDatabaseIfNecessary();
        const device = Device.devices[ieeeAddr];
        return (device === null || device === void 0 ? void 0 : device._deleted) && !includeDeleted ? undefined : device;
    }
    static byNetworkAddress(networkAddress) {
        return Device.all().find(d => d.networkAddress === networkAddress);
    }
    static byType(type) {
        return Device.all().filter(d => d.type === type);
    }
    static all() {
        Device.loadFromDatabaseIfNecessary();
        return Object.values(Device.devices).filter(d => !d._deleted);
    }
    undelete() {
        assert_1.default(this._deleted, `Device '${this.ieeeAddr}' is not deleted`);
        this._deleted = false;
        entity_1.default.database.insert(this.toDatabaseEntry());
    }
    static create(type, ieeeAddr, networkAddress, manufacturerID, manufacturerName, powerSource, modelID, interviewCompleted, endpoints) {
        Device.loadFromDatabaseIfNecessary();
        if (Device.devices[ieeeAddr] && !Device.devices[ieeeAddr]._deleted) {
            throw new Error(`Device with ieeeAddr '${ieeeAddr}' already exists`);
        }
        const endpointsMapped = endpoints.map((e) => {
            return endpoint_1.default.create(e.ID, e.profileID, e.deviceID, e.inputClusters, e.outputClusters, networkAddress, ieeeAddr);
        });
        const ID = entity_1.default.database.newID();
        const device = new Device(ID, type, ieeeAddr, networkAddress, manufacturerID, endpointsMapped, manufacturerName, powerSource, modelID, undefined, undefined, undefined, undefined, undefined, undefined, interviewCompleted, {}, null, 'immediate');
        entity_1.default.database.insert(device.toDatabaseEntry());
        Device.devices[device.ieeeAddr] = device;
        return device;
    }
    /*
     * Zigbee functions
     */
    async interview() {
        if (this.interviewing) {
            const message = `Interview - interview already in progress for '${this.ieeeAddr}'`;
            debug.log(message);
            throw new Error(message);
        }
        let error;
        this._interviewing = true;
        debug.log(`Interview - start device '${this.ieeeAddr}'`);
        try {
            await this.interviewInternal();
            debug.log(`Interview - completed for device '${this.ieeeAddr}'`);
            this._interviewCompleted = true;
        }
        catch (e) {
            if (this.interviewQuirks()) {
                debug.log(`Interview - completed for device '${this.ieeeAddr}' because of quirks ('${e}')`);
            }
            else {
                debug.log(`Interview - failed for device '${this.ieeeAddr}' with error '${e.stack}'`);
                error = e;
            }
        }
        finally {
            this._interviewing = false;
            this.save();
        }
        if (error) {
            throw error;
        }
    }
    interviewQuirks() {
        var _a, _b, _c;
        debug.log(`Interview - quirks check for '${this.modelID}'-'${this.manufacturerName}'-'${this.type}'`);
        // TuYa devices are typically hard to interview. They also don't require a full interview to work correctly
        // e.g. no ias enrolling is required for the devices to work.
        // Assume that in case we got both the manufacturerName and modelID the device works correctly.
        // https://github.com/Koenkk/zigbee2mqtt/issues/7564:
        //      Fails during ias enroll due to UNSUPPORTED_ATTRIBUTE
        // https://github.com/Koenkk/zigbee2mqtt/issues/4655
        //      Device does not change zoneState after enroll (event with original gateway)
        // modelID is mostly in the form of e.g. TS0202 and manufacturerName like e.g. _TYZB01_xph99wvr
        if (((_a = this.modelID) === null || _a === void 0 ? void 0 : _a.match('^TS\\d*$')) &&
            (((_b = this.manufacturerName) === null || _b === void 0 ? void 0 : _b.match('^_TZ.*_.*$')) || ((_c = this.manufacturerName) === null || _c === void 0 ? void 0 : _c.match('^_TYZB01_.*$')))) {
            this._powerSource = this._powerSource || 'Battery';
            this._interviewing = false;
            this._interviewCompleted = true;
            this.save();
            debug.log(`Interview - quirks matched for TuYa end device`);
            return true;
        }
        // Some devices, e.g. Xiaomi end devices have a different interview procedure, after pairing they
        // report it's modelID trough a readResponse. The readResponse is received by the controller and set
        // on the device.
        const lookup = {
            '^3R.*?Z': {
                type: 'EndDevice', powerSource: 'Battery'
            },
            'lumi\..*': {
                type: 'EndDevice', manufacturerID: 4151, manufacturerName: 'LUMI', powerSource: 'Battery'
            },
            'TERNCY-PP01': {
                type: 'EndDevice', manufacturerID: 4648, manufacturerName: 'TERNCY', powerSource: 'Battery'
            },
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2710
            '3RWS18BZ': {},
            'MULTI-MECI--EA01': {},
        };
        const match = Object.keys(lookup).find((key) => this.modelID && this.modelID.match(key));
        if (match) {
            const info = lookup[match];
            debug.log(`Interview procedure failed but got modelID matching '${match}', assuming interview succeeded`);
            this._type = this._type === 'Unknown' ? info.type : this._type;
            this._manufacturerID = this._manufacturerID || info.manufacturerID;
            this._manufacturerName = this._manufacturerName || info.manufacturerName;
            this._powerSource = this._powerSource || info.powerSource;
            this._interviewing = false;
            this._interviewCompleted = true;
            this.save();
            debug.log(`Interview - quirks matched on '${match}'`);
            return true;
        }
        else {
            debug.log('Interview - quirks did not match');
            return false;
        }
    }
    async interviewInternal() {
        const nodeDescriptorQuery = async () => {
            const nodeDescriptor = await entity_1.default.adapter.nodeDescriptor(this.networkAddress);
            this._manufacturerID = nodeDescriptor.manufacturerCode;
            this._type = nodeDescriptor.type;
            this.save();
            debug.log(`Interview - got node descriptor for device '${this.ieeeAddr}'`);
        };
        const hasNodeDescriptor = () => this._manufacturerID != null && this._type != null;
        if (!hasNodeDescriptor()) {
            for (let attempt = 0; attempt < 6; attempt++) {
                try {
                    await nodeDescriptorQuery();
                    break;
                }
                catch (error) {
                    if (this.interviewQuirks()) {
                        debug.log(`Interview - completed for device '${this.ieeeAddr}' because of quirks ('${error}')`);
                        return;
                    }
                    else {
                        // Most of the times the first node descriptor query fails and the seconds one succeeds.
                        debug.log(`Interview - node descriptor request failed for '${this.ieeeAddr}', attempt ${attempt + 1}`);
                    }
                }
            }
        }
        else {
            debug.log(`Interview - skip node descriptor request for '${this.ieeeAddr}', already got it`);
        }
        if (!hasNodeDescriptor()) {
            throw new Error(`Interview failed because can not get node descriptor ('${this.ieeeAddr}')`);
        }
        if (this.manufacturerID === 4619 && this._type === 'EndDevice') {
            // Give TuYa end device some time to pair. Otherwise they leave immediately.
            // https://github.com/Koenkk/zigbee2mqtt/issues/5814
            debug.log("Interview - Detected TuYa end device, waiting 10 seconds...");
            await utils_1.Wait(10000);
        }
        else if ([0, 4098].includes(this.manufacturerID)) {
            // Potentially a TuYa device, some sleep fast so make sure to read the modelId and manufacturerName quickly.
            // In case the device responds, the endoint and modelID/manufacturerName are set
            // in controller.onZclOrRawData()
            // https://github.com/Koenkk/zigbee2mqtt/issues/7553
            debug.log("Interview - Detected potential TuYa end device, reading modelID and manufacturerName...");
            try {
                const endpoint = endpoint_1.default.create(1, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr);
                const result = await endpoint.read('genBasic', ['modelId', 'manufacturerName'], { sendWhen: 'immediate' });
                Object.entries(result)
                    .forEach((entry) => Device.ReportablePropertiesMapping[entry[0]].set(entry[1], this));
            }
            catch (error) {
                /* istanbul ignore next */
                debug.log(`Interview - TuYa read modelID and manufacturerName failed (${error})`);
            }
        }
        // e.g. Xiaomi Aqara Opple devices fail to respond to the first active endpoints request, therefore try 2 times
        // https://github.com/Koenkk/zigbee-herdsman/pull/103
        let activeEndpoints;
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                activeEndpoints = await entity_1.default.adapter.activeEndpoints(this.networkAddress);
                break;
            }
            catch (error) {
                debug.log(`Interview - active endpoints request failed for '${this.ieeeAddr}', attempt ${attempt + 1}`);
            }
        }
        if (!activeEndpoints) {
            throw new Error(`Interview failed because can not get active endpoints ('${this.ieeeAddr}')`);
        }
        // Make sure that the endpoint are sorted.
        activeEndpoints.endpoints.sort();
        // Some devices, e.g. TERNCY return endpoint 0 in the active endpoints request.
        // This is not a valid endpoint number according to the ZCL, requesting a simple descriptor will result
        // into an error. Therefore we filter it, more info: https://github.com/Koenkk/zigbee-herdsman/issues/82
        activeEndpoints.endpoints.filter((e) => e !== 0 && !this.getEndpoint(e)).forEach((e) => this._endpoints.push(endpoint_1.default.create(e, undefined, undefined, [], [], this.networkAddress, this.ieeeAddr)));
        this.save();
        debug.log(`Interview - got active endpoints for device '${this.ieeeAddr}'`);
        for (const endpointID of activeEndpoints.endpoints) {
            const endpoint = this.getEndpoint(endpointID);
            const simpleDescriptor = await entity_1.default.adapter.simpleDescriptor(this.networkAddress, endpoint.ID);
            endpoint.profileID = simpleDescriptor.profileID;
            endpoint.deviceID = simpleDescriptor.deviceID;
            endpoint.inputClusters = simpleDescriptor.inputClusters;
            endpoint.outputClusters = simpleDescriptor.outputClusters;
            debug.log(`Interview - got simple descriptor for endpoint '${endpoint.ID}' device '${this.ieeeAddr}'`);
            this.save();
            // Read attributes, nice to have but not required for succesfull pairing as most of the attributes
            // are not mandatory in ZCL specification.
            if (endpoint.supportsInputCluster('genBasic')) {
                for (const [key, item] of Object.entries(Device.ReportablePropertiesMapping)) {
                    if (!this[item.key]) {
                        try {
                            let result;
                            try {
                                result = await endpoint.read('genBasic', [key], { sendWhen: 'immediate' });
                            }
                            catch (error) {
                                // Reading attributes can fail for many reason, e.g. it could be that device rejoins
                                // while joining like in:
                                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/2485.
                                // The modelID and manufacturerName are crucial for device identification, so retry.
                                if (item.key === 'modelID' || item.key === 'manufacturerName') {
                                    debug.log(`Interview - first ${item.key} retrieval attempt failed, ` +
                                        `retrying after 10 seconds...`);
                                    await utils_1.Wait(10000);
                                    result = await endpoint.read('genBasic', [key], { sendWhen: 'immediate' });
                                }
                            }
                            item.set(result[key], this);
                            debug.log(`Interview - got '${item.key}' for device '${this.ieeeAddr}'`);
                        }
                        catch (error) {
                            debug.log(`Interview - failed to read attribute '${item.key}' from ` +
                                `endpoint '${endpoint.ID}' (${error})`);
                        }
                    }
                }
            }
        }
        const coordinator = Device.byType('Coordinator')[0];
        // Enroll IAS device
        for (const endpoint of this.endpoints.filter((e) => e.supportsInputCluster('ssIasZone'))) {
            debug.log(`Interview - IAS - enrolling '${this.ieeeAddr}' endpoint '${endpoint.ID}'`);
            const stateBefore = await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState'], { sendWhen: 'immediate' });
            debug.log(`Interview - IAS - before enrolling state: '${JSON.stringify(stateBefore)}'`);
            // Do not enroll when device has already been enrolled
            if (stateBefore.zoneState !== 1 || stateBefore.iasCieAddr !== coordinator.ieeeAddr) {
                debug.log(`Interview - IAS - not enrolled, enrolling`);
                await endpoint.write('ssIasZone', { 'iasCieAddr': coordinator.ieeeAddr }, { sendWhen: 'immediate' });
                debug.log(`Interview - IAS - wrote iasCieAddr`);
                // There are 2 enrollment procedures:
                // - Auto enroll: coordinator has to send enrollResponse without receiving an enroll request
                //                this case is handled below.
                // - Manual enroll: coordinator replies to enroll request with an enroll response.
                //                  this case in hanled in onZclData().
                // https://github.com/Koenkk/zigbee2mqtt/issues/4569#issuecomment-706075676
                await utils_1.Wait(500);
                debug.log(`IAS - '${this.ieeeAddr}' sending enroll response (auto enroll)`);
                const payload = { enrollrspcode: 0, zoneid: 23 };
                await endpoint.command('ssIasZone', 'enrollRsp', payload, { disableDefaultResponse: true, sendWhen: 'immediate' });
                let enrolled = false;
                for (let attempt = 0; attempt < 20; attempt++) {
                    await utils_1.Wait(500);
                    const stateAfter = await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState'], { sendWhen: 'immediate' });
                    debug.log(`Interview - IAS - after enrolling state (${attempt}): '${JSON.stringify(stateAfter)}'`);
                    if (stateAfter.zoneState === 1) {
                        enrolled = true;
                        break;
                    }
                }
                if (enrolled) {
                    debug.log(`Interview - IAS successfully enrolled '${this.ieeeAddr}' endpoint '${endpoint.ID}'`);
                }
                else {
                    throw new Error(`Interview failed because of failed IAS enroll (zoneState didn't change ('${this.ieeeAddr}')`);
                }
            }
            else {
                debug.log(`Interview - IAS - already enrolled, skipping enroll`);
            }
        }
        // Bind poll control
        for (const endpoint of this.endpoints.filter((e) => e.supportsInputCluster('genPollCtrl'))) {
            debug.log(`Interview - Poll control - binding '${this.ieeeAddr}' endpoint '${endpoint.ID}'`);
            await endpoint.bind('genPollCtrl', coordinator.endpoints[0]);
            const pollPeriod = await endpoint.read('genPollCtrl', ['checkinInterval']);
            if (pollPeriod.checkinInterval <= 2400) { // 10 minutes
                this.defaultSendRequestWhen = 'fastpoll';
            }
            else {
                this.defaultSendRequestWhen = 'active';
            }
        }
    }
    async removeFromNetwork() {
        if (this._type === 'GreenPower') {
            const payload = {
                options: 0x002550,
                srcID: Number(this.ieeeAddr),
            };
            const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'pairing', 33, payload);
            await entity_1.default.adapter.sendZclFrameToAll(242, frame, 242);
        }
        else
            await entity_1.default.adapter.removeDevice(this.networkAddress, this.ieeeAddr);
        await this.removeFromDatabase();
    }
    async removeFromDatabase() {
        Device.loadFromDatabaseIfNecessary();
        for (const endpoint of this.endpoints) {
            endpoint.removeFromAllGroupsDatabase();
        }
        if (entity_1.default.database.has(this.ID)) {
            entity_1.default.database.remove(this.ID);
        }
        this._deleted = true;
        // Clear all data in case device joins again
        this._interviewCompleted = false;
        this._interviewing = false;
        this.meta = {};
        const newEndpoints = [];
        for (const endpoint of this.endpoints) {
            newEndpoints.push(endpoint_1.default.create(endpoint.ID, endpoint.profileID, endpoint.deviceID, endpoint.inputClusters, endpoint.outputClusters, this.networkAddress, this.ieeeAddr));
        }
        this._endpoints = newEndpoints;
    }
    async lqi() {
        return entity_1.default.adapter.lqi(this.networkAddress);
    }
    async routingTable() {
        return entity_1.default.adapter.routingTable(this.networkAddress);
    }
    async ping(disableRecovery = true) {
        // Zigbee does not have an official pining mechamism. Use a read request
        // of a mandatory basic cluster attribute to keep it as lightweight as
        // possible.
        await this.endpoints[0].read('genBasic', ['zclVersion'], { disableRecovery });
    }
}
// This lookup contains all devices that are queried from the database, this is to ensure that always
// the same instance is returned.
Device.devices = null;
Device.ReportablePropertiesMapping = {
    modelId: { key: 'modelID', set: (v, d) => { d.modelID = v; } },
    manufacturerName: { key: 'manufacturerName', set: (v, d) => { d.manufacturerName = v; } },
    powerSource: { key: 'powerSource', set: (v, d) => { d.powerSource = v; } },
    zclVersion: { key: 'zclVersion', set: (v, d) => { d.zclVersion = v; } },
    appVersion: { key: 'applicationVersion', set: (v, d) => { d.applicationVersion = v; } },
    stackVersion: { key: 'stackVersion', set: (v, d) => { d.stackVersion = v; } },
    hwVersion: { key: 'hardwareVersion', set: (v, d) => { d.hardwareVersion = v; } },
    dateCode: { key: 'dateCode', set: (v, d) => { d.dateCode = v; } },
    swBuildId: { key: 'softwareBuildID', set: (v, d) => { d.softwareBuildID = v; } },
};
exports.default = Device;
//# sourceMappingURL=device.js.map