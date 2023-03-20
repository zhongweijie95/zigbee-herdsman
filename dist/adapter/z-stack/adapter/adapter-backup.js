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
exports.AdapterBackup = void 0;
/* eslint-disable max-len */
const debug_1 = __importDefault(require("debug"));
const Structs = __importStar(require("../structs"));
const Utils = __importStar(require("../utils"));
const utils_1 = require("../../../utils");
const mz_1 = require("mz");
const common_1 = require("../constants/common");
const constants_1 = require("../unpi/constants");
const tstype_1 = require("./tstype");
const structs_1 = require("../structs");
/**
 * Class providing ZNP adapter backup and restore procedures based mostly on NV memory manipulation.
 */
class AdapterBackup {
    constructor(znp, nv, path) {
        this.debug = debug_1.default("zigbee-herdsman:adapter:zStack:startup:backup");
        this.znp = znp;
        this.nv = nv;
        this.defaultPath = path;
    }
    /**
     * Loads currently stored backup and returns it in internal backup model.
     */
    async getStoredBackup() {
        var _a, _b, _c, _d;
        try {
            await mz_1.fs.access(this.defaultPath);
        }
        catch (error) {
            return null;
        }
        let data;
        try {
            data = JSON.parse((await mz_1.fs.readFile(this.defaultPath)).toString());
        }
        catch (error) {
            throw new Error('Coordinator backup is corrupted');
        }
        if (((_a = data.metadata) === null || _a === void 0 ? void 0 : _a.format) === "zigpy/open-coordinator-backup" && ((_b = data.metadata) === null || _b === void 0 ? void 0 : _b.version)) {
            if (((_c = data.metadata) === null || _c === void 0 ? void 0 : _c.version) !== 1) {
                throw new Error(`Unsupported open coordinator backup version (version=${(_d = data.metadata) === null || _d === void 0 ? void 0 : _d.version})`);
            }
            return utils_1.BackupUtils.fromUnifiedBackup(data);
        }
        else if (data.adapterType === "zStack") {
            return utils_1.BackupUtils.fromLegacyBackup(data);
        }
        else {
            throw new Error("Unknown backup format");
        }
    }
    /**
     * Creates a new backup from connected ZNP adapter and returns it in internal backup model format.
     */
    async createBackup() {
        this.debug("creating backup");
        const version = await this.getAdapterVersion();
        /* get adapter ieee address */
        const ieeeAddressResponse = await this.znp.request(constants_1.Subsystem.SYS, "getExtAddr", {});
        if (!ieeeAddressResponse || !ieeeAddressResponse.payload.extaddress || !ieeeAddressResponse.payload.extaddress.startsWith("0x")) {
            throw new Error("Failed to read adapter IEEE address");
        }
        const ieeeAddress = Buffer.from(ieeeAddressResponse.payload.extaddress.split("0x")[1], "hex");
        this.debug("fetched adapter ieee address");
        /* get adapter nib */
        const nib = await this.nv.readItem(common_1.NvItemsIds.NIB, 0, Structs.nib);
        if (!nib) {
            throw new Error("Cannot backup - adapter not commissioned");
        }
        this.debug("fetched adapter nib");
        /* get adapter active key information */
        let activeKeyInfo;
        if (version === tstype_1.ZnpVersion.zStack12) {
            const key = Structs.nwkKey((await this.znp.request(constants_1.Subsystem.SAPI, "readConfiguration", { configid: common_1.NvItemsIds.PRECFGKEY })).payload.value);
            activeKeyInfo = Structs.nwkKeyDescriptor();
            activeKeyInfo.key = key.key;
        }
        else {
            activeKeyInfo = await this.nv.readItem(common_1.NvItemsIds.NWK_ACTIVE_KEY_INFO, 0, Structs.nwkKeyDescriptor);
        }
        if (!activeKeyInfo) {
            throw new Error("Cannot backup - missing active key info");
        }
        this.debug("fetched adapter active key information");
        /* get adapter security data */
        const preconfiguredKeyEnabled = await this.nv.readItem(common_1.NvItemsIds.PRECFGKEYS_ENABLE, 0);
        this.debug("fetched adapter pre-configured key");
        const addressManagerTable = await this.getAddressManagerTable(version);
        this.debug(`fetched adapter address manager table (capacity=${(addressManagerTable === null || addressManagerTable === void 0 ? void 0 : addressManagerTable.capacity) || 0}, used=${(addressManagerTable === null || addressManagerTable === void 0 ? void 0 : addressManagerTable.usedCount) || 0})`);
        const securityManagerTable = await this.getSecurityManagerTable();
        this.debug(`fetched adapter security manager table (capacity=${(securityManagerTable === null || securityManagerTable === void 0 ? void 0 : securityManagerTable.usedCount) || 0}, used=${(securityManagerTable === null || securityManagerTable === void 0 ? void 0 : securityManagerTable.usedCount) || 0})`);
        const apsLinkKeyDataTable = await this.getApsLinkKeyDataTable(version);
        this.debug(`fetched adapter aps link key data table (capacity=${(apsLinkKeyDataTable === null || apsLinkKeyDataTable === void 0 ? void 0 : apsLinkKeyDataTable.usedCount) || 0}, used=${(apsLinkKeyDataTable === null || apsLinkKeyDataTable === void 0 ? void 0 : apsLinkKeyDataTable.usedCount) || 0})`);
        const tclkSeed = version === tstype_1.ZnpVersion.zStack12 ? null : await this.nv.readItem(common_1.NvItemsIds.TCLK_SEED, 0, Structs.nwkKey);
        this.debug("fetched adapter tclk seed");
        const tclkTable = await this.getTclkTable(version);
        this.debug(`fetched adapter tclk table (capacity=${(tclkTable === null || tclkTable === void 0 ? void 0 : tclkTable.usedCount) || 0}, used=${(tclkTable === null || tclkTable === void 0 ? void 0 : tclkTable.usedCount) || 0})`);
        const secMaterialTable = await this.getNetworkSecurityMaterialTable(version);
        this.debug(`fetched adapter network security material table (capacity=${(secMaterialTable === null || secMaterialTable === void 0 ? void 0 : secMaterialTable.usedCount) || 0}, used=${(secMaterialTable === null || secMaterialTable === void 0 ? void 0 : secMaterialTable.usedCount) || 0})`);
        /* examine network security material table */
        const genericExtendedPanId = Buffer.alloc(8, 0xff);
        let secMaterialDescriptor = null;
        /* istanbul ignore next */
        for (const entry of secMaterialTable.used) {
            if (entry.extendedPanID.equals(nib.extendedPANID)) {
                secMaterialDescriptor = entry;
                break;
            }
            else if (!secMaterialDescriptor && entry.extendedPanID.equals(genericExtendedPanId)) {
                secMaterialDescriptor = entry;
            }
        }
        if (!secMaterialDescriptor) {
            secMaterialDescriptor = Structs.nwkSecMaterialDescriptorEntry();
            secMaterialDescriptor.extendedPanID = nib.extendedPANID;
            secMaterialDescriptor.FrameCounter = version === tstype_1.ZnpVersion.zStack12 ? 0 : 1250;
        }
        /* return backup structure */
        /* istanbul ignore next */
        return {
            znp: {
                version: version,
                trustCenterLinkKeySeed: (tclkSeed === null || tclkSeed === void 0 ? void 0 : tclkSeed.key) || undefined
            },
            networkOptions: {
                panId: nib.nwkPanId,
                extendedPanId: nib.extendedPANID,
                channelList: Utils.unpackChannelList(nib.channelList),
                networkKey: activeKeyInfo.key,
                networkKeyDistribute: preconfiguredKeyEnabled && preconfiguredKeyEnabled[0] === 0x01
            },
            logicalChannel: nib.nwkLogicalChannel,
            networkKeyInfo: {
                sequenceNumber: activeKeyInfo.keySeqNum,
                frameCounter: secMaterialDescriptor.FrameCounter
            },
            securityLevel: nib.SecurityLevel,
            networkUpdateId: nib.nwkUpdateId,
            coordinatorIeeeAddress: ieeeAddress,
            devices: addressManagerTable && addressManagerTable.used.map((ame, ami) => {
                /* take all entries of assoc and/or security type */
                if (!ame.isSet() || (ame.user & (structs_1.AddressManagerUser.Assoc | structs_1.AddressManagerUser.Security)) === 0) {
                    /* istanbul ignore next */
                    return null;
                }
                let linkKeyInfo = null;
                const sme = securityManagerTable.used.find(e => e.ami === ami);
                if (sme) {
                    const apsKeyDataIndex = version === tstype_1.ZnpVersion.zStack30x ? sme.keyNvId - common_1.NvItemsIds.APS_LINK_KEY_DATA_START : sme.keyNvId;
                    const apsKeyData = apsLinkKeyDataTable.used[apsKeyDataIndex] || null;
                    if (apsKeyData) {
                        linkKeyInfo = {
                            key: apsKeyData.key,
                            rxCounter: apsKeyData.rxFrmCntr,
                            txCounter: apsKeyData.txFrmCntr
                        };
                    }
                }
                else {
                    const tclkTableEntry = tclkTable.used.find(e => e.extAddr.equals(ame.extAddr));
                    if (tclkTableEntry) {
                        const rotatedSeed = Buffer.concat([tclkSeed.key.slice(tclkTableEntry.SeedShift_IcIndex), tclkSeed.key.slice(0, tclkTableEntry.SeedShift_IcIndex)]);
                        const extAddrReversed = Buffer.from(ame.extAddr).reverse();
                        const extAddrRepeated = Buffer.concat([extAddrReversed, extAddrReversed]);
                        const derivedKey = Buffer.alloc(16);
                        for (let i = 0; i < 16; i++) {
                            derivedKey[i] = rotatedSeed[i] ^ extAddrRepeated[i];
                        }
                        linkKeyInfo = {
                            key: derivedKey,
                            rxCounter: tclkTableEntry.rxFrmCntr,
                            txCounter: tclkTableEntry.txFrmCntr
                        };
                    }
                }
                return {
                    networkAddress: ame.nwkAddr,
                    ieeeAddress: ame.extAddr,
                    isDirectChild: (ame.user & structs_1.AddressManagerUser.Assoc) > 0,
                    linkKey: !linkKeyInfo ? undefined : linkKeyInfo
                };
            }).filter(e => e) || []
        };
    }
    /**
     * Restores a structure in internal backup format to connected ZNP adapter.
     *
     * @param backup Backup to restore to connected adapter.
     */
    async restoreBackup(backup) {
        var _a, _b;
        this.debug("restoring backup");
        const version = await this.getAdapterVersion();
        /* istanbul ignore next */
        if (version === tstype_1.ZnpVersion.zStack12) {
            throw new Error("backup cannot be restored on Z-Stack 1.2 adapter");
        }
        /* fetch provisional NIB */
        const nib = await this.nv.readItem(common_1.NvItemsIds.NIB, 0, Structs.nib);
        /* update NIB with desired nwk config */
        nib.nwkPanId = backup.networkOptions.panId;
        nib.channelList = Utils.packChannelList(backup.networkOptions.channelList);
        nib.nwkLogicalChannel = backup.networkOptions.channelList[0];
        nib.extendedPANID = backup.networkOptions.extendedPanId;
        nib.SecurityLevel = backup.securityLevel;
        nib.nwkUpdateId = backup.networkUpdateId;
        /* prepare key info */
        const keyDescriptor = Structs.nwkKeyDescriptor();
        keyDescriptor.keySeqNum = backup.networkKeyInfo.sequenceNumber || 0;
        keyDescriptor.key = backup.networkOptions.networkKey;
        /* determine table sizes */
        const currentAddressManagerTable = await this.getAddressManagerTable(version);
        const currentSecurityManagerTable = await this.getSecurityManagerTable();
        const currentApsLinkKeyDataTable = await this.getApsLinkKeyDataTable(version);
        const currentTclkTable = await this.getTclkTable(version);
        const currentNwkSecMaterialTable = await this.getNetworkSecurityMaterialTable(version);
        this.debug(`got target adapter table sizes:`);
        this.debug(` - address manager table: ${currentAddressManagerTable.capacity}`);
        this.debug(` - security manager table: ${currentSecurityManagerTable.capacity}`);
        this.debug(` - aps link key data table: ${currentApsLinkKeyDataTable.capacity}`);
        this.debug(` - tclk table: ${currentTclkTable.capacity}`);
        this.debug(` - network security material table: ${currentNwkSecMaterialTable.capacity}`);
        /* prepare table structures */
        const addressManagerTable = Structs.addressManagerTable(currentAddressManagerTable.capacity);
        const securityManagerTable = Structs.securityManagerTable(currentSecurityManagerTable.capacity);
        const apsLinkKeyDataTable = Structs.apsLinkKeyDataTable(currentApsLinkKeyDataTable.capacity);
        const tclkTable = Structs.apsTcLinkKeyTable(currentTclkTable.capacity);
        const nwkSecurityMaterialTable = Structs.nwkSecMaterialDescriptorTable(currentNwkSecMaterialTable.capacity);
        /* prepare security material table (nwk frame counters) */
        const mwkSecMaterialEntry = nwkSecurityMaterialTable.entries[0];
        mwkSecMaterialEntry.extendedPanID = backup.networkOptions.extendedPanId;
        mwkSecMaterialEntry.FrameCounter = backup.networkKeyInfo.frameCounter + 2500;
        const genericNwkSecMaterialEntry = nwkSecurityMaterialTable.entries[nwkSecurityMaterialTable.capacity - 1];
        genericNwkSecMaterialEntry.extendedPanID = Buffer.alloc(8, 0xff);
        genericNwkSecMaterialEntry.FrameCounter = backup.networkKeyInfo.frameCounter + 2500;
        /* populate device & security tables and write them */
        for (const device of backup.devices) {
            const ame = addressManagerTable.getNextFree();
            ame.nwkAddr = device.networkAddress;
            ame.extAddr = device.ieeeAddress;
            ame.user = device.isDirectChild ? structs_1.AddressManagerUser.Assoc : structs_1.AddressManagerUser.Default;
            if (device.linkKey) {
                let linkKeyProcessed = false;
                /* attempt to recover tclk seed parameters (if available) */
                if ((_a = backup.znp) === null || _a === void 0 ? void 0 : _a.trustCenterLinkKeySeed) {
                    const tclkSeed = backup.znp.trustCenterLinkKeySeed;
                    const extAddrReversed = Buffer.from(ame.extAddr).reverse();
                    const extAddrRepeated = Buffer.concat([extAddrReversed, extAddrReversed]);
                    const recoveredKey = Buffer.alloc(16);
                    for (let i = 0; i < 16; i++) {
                        recoveredKey[i] = device.linkKey.key[i] ^ extAddrRepeated[i];
                    }
                    let recoveredSeedShift = null;
                    for (let i = 0; i < 16; i++) {
                        const rotated = Buffer.concat([recoveredKey.slice(recoveredKey.length - i, recoveredKey.length), recoveredKey.slice(0, recoveredKey.length - i)]);
                        if (rotated.equals(tclkSeed)) {
                            recoveredSeedShift = i;
                            break;
                        }
                    }
                    if (recoveredSeedShift !== null) {
                        ame.user |= structs_1.AddressManagerUser.Security;
                        const tclkEntry = tclkTable.getNextFree();
                        if (!tclkEntry) {
                            throw new Error(`target adapter tclk table size insufficient (size=${tclkTable.capacity})`);
                        }
                        tclkEntry.extAddr = ame.extAddr;
                        tclkEntry.SeedShift_IcIndex = recoveredSeedShift;
                        tclkEntry.keyAttributes = 2;
                        tclkEntry.keyType = 0;
                        tclkEntry.rxFrmCntr = device.linkKey.rxCounter;
                        tclkEntry.txFrmCntr = device.linkKey.txCounter + 2500;
                        linkKeyProcessed = true;
                        this.debug(`successfully recovered link key for ${device.ieeeAddress.toString("hex")} using tclk seed (shift=${recoveredSeedShift})`);
                    }
                }
                /* attempt to create aps link key data entry */
                if (!linkKeyProcessed) {
                    ame.user |= structs_1.AddressManagerUser.Security;
                    const apsKeyDataEntry = apsLinkKeyDataTable.getNextFree();
                    if (!apsKeyDataEntry) {
                        throw new Error(`target adapter aps link key data table size insufficient (size=${apsLinkKeyDataTable.capacity})`);
                    }
                    apsKeyDataEntry.key = device.linkKey.key;
                    apsKeyDataEntry.rxFrmCntr = device.linkKey.rxCounter;
                    apsKeyDataEntry.txFrmCntr = device.linkKey.txCounter + 2500;
                    const sme = securityManagerTable.getNextFree();
                    if (!sme) {
                        throw new Error(`target adapter security manager table size insufficient (size=${securityManagerTable.capacity})`);
                    }
                    sme.ami = addressManagerTable.indexOf(ame);
                    sme.keyNvId = version === tstype_1.ZnpVersion.zStack3x0 ? apsLinkKeyDataTable.indexOf(apsKeyDataEntry) : common_1.NvItemsIds.APS_LINK_KEY_DATA_START + apsLinkKeyDataTable.indexOf(apsKeyDataEntry);
                    sme.authenticationOption = structs_1.SecurityManagerAuthenticationOption.AuthenticatedCBCK;
                    linkKeyProcessed = true;
                    this.debug(`successfully recovered link key for ${device.ieeeAddress.toString("hex")} using aps key data table`);
                }
            }
        }
        /* recover coordinator ieee address */
        const reversedAdapterIeee = Buffer.from(backup.coordinatorIeeeAddress).reverse();
        await this.nv.writeItem(common_1.NvItemsIds.EXTADDR, reversedAdapterIeee);
        /* write updated nib */
        await this.nv.writeItem(common_1.NvItemsIds.NIB, nib);
        /* write network key info */
        await this.nv.updateItem(common_1.NvItemsIds.NWK_ACTIVE_KEY_INFO, keyDescriptor.serialize());
        await this.nv.updateItem(common_1.NvItemsIds.NWK_ALTERN_KEY_INFO, keyDescriptor.serialize());
        /* write tclk seed if present */
        if ((_b = backup.znp) === null || _b === void 0 ? void 0 : _b.trustCenterLinkKeySeed) {
            await this.nv.writeItem(common_1.NvItemsIds.TCLK_SEED, backup.znp.trustCenterLinkKeySeed);
        }
        /* write network security material table (nwk frame counters) */
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            await this.nv.writeTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.EX_NWK_SEC_MATERIAL_TABLE, nwkSecurityMaterialTable);
        }
        else {
            await this.nv.writeTable("legacy", common_1.NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_START, nwkSecurityMaterialTable);
        }
        /* write address manager table */
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            await this.nv.writeTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.ZCD_NV_EX_ADDRMGR, addressManagerTable);
        }
        else {
            await this.nv.writeItem(common_1.NvItemsIds.ADDRMGR, addressManagerTable);
        }
        /* write security manager table */
        await this.nv.writeItem(common_1.NvItemsIds.APS_LINK_KEY_TABLE, securityManagerTable);
        /* write aps link key data table */
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            await this.nv.writeTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.ZCD_NV_EX_APS_KEY_DATA_TABLE, apsLinkKeyDataTable);
        }
        else {
            await this.nv.writeTable("legacy", common_1.NvItemsIds.APS_LINK_KEY_DATA_START, apsLinkKeyDataTable);
        }
        /* write tclk table */
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            await this.nv.writeTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.EX_TCLK_TABLE, tclkTable);
        }
        else {
            await this.nv.writeTable("legacy", common_1.NvItemsIds.LEGACY_TCLK_TABLE_START, tclkTable);
        }
    }
    /**
     * Acquires ZNP version internal to `zigbee-herdsman` from controller.
     *
     * *If Z-Stack 1.2 controller is detected an error is thrown, since Z-Stack 1.2 backup
     * and restore procedures are not supported.*
     */
    async getAdapterVersion() {
        const versionResponse = await this.znp.request(constants_1.Subsystem.SYS, "version", {});
        const version = versionResponse.payload.product;
        return version;
    }
    /**
     * Internal method to retrieve address manager table.
     *
     * @param version ZNP stack version the adapter is running.
     */
    async getAddressManagerTable(version) {
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            return this.nv.readTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.ZCD_NV_EX_ADDRMGR, undefined, Structs.addressManagerTable);
        }
        else {
            return this.nv.readItem(common_1.NvItemsIds.ADDRMGR, 0, Structs.addressManagerTable);
        }
    }
    /**
     * Internal method to retrieve security manager table. Also referred to as APS Link Key Table.
     */
    async getSecurityManagerTable() {
        return this.nv.readItem(common_1.NvItemsIds.APS_LINK_KEY_TABLE, 0, Structs.securityManagerTable);
    }
    /**
     * Internal method to retrieve APS Link Key Data Table containing arbitrary APS link keys.
     *
     * @param version ZNP stack version the adapter is running.
     */
    async getApsLinkKeyDataTable(version) {
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            return this.nv.readTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.ZCD_NV_EX_APS_KEY_DATA_TABLE, undefined, Structs.apsLinkKeyDataTable);
        }
        else {
            return this.nv.readTable("legacy", common_1.NvItemsIds.APS_LINK_KEY_DATA_START, 255, Structs.apsLinkKeyDataTable);
        }
    }
    /**
     * Internal method to retrieve Trust Center Link Key table which describes seed-based APS link keys for devices.
     *
     * @param version ZNP stack version the adapter is running.
     */
    async getTclkTable(version) {
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            return this.nv.readTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.EX_TCLK_TABLE, undefined, Structs.apsTcLinkKeyTable);
        }
        else {
            return this.nv.readTable("legacy", common_1.NvItemsIds.LEGACY_TCLK_TABLE_START, 239, Structs.apsTcLinkKeyTable);
        }
    }
    /**
     * Internal method to retrieve network security material table, which contains network key frame counter.
     *
     * @param version ZNP stack version the adapter is running.
     */
    async getNetworkSecurityMaterialTable(version) {
        if (version === tstype_1.ZnpVersion.zStack3x0) {
            return this.nv.readTable("extended", common_1.NvSystemIds.ZSTACK, common_1.NvItemsIds.EX_NWK_SEC_MATERIAL_TABLE, undefined, Structs.nwkSecMaterialDescriptorTable);
        }
        else {
            return this.nv.readTable("legacy", common_1.NvItemsIds.LEGACY_NWK_SEC_MATERIAL_TABLE_START, 12, Structs.nwkSecMaterialDescriptorTable);
        }
    }
}
exports.AdapterBackup = AdapterBackup;
//# sourceMappingURL=adapter-backup.js.map