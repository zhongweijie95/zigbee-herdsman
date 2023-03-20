"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdapterNvMemory = void 0;
/* eslint-disable max-len */
const common_1 = require("../constants/common");
const constants_1 = require("../unpi/constants");
/**
 * Adapter non-volatile memory instrumentation. This class provides interface to interact
 * with ZNP adapter's NV memory. Provided functionality covers basic operations from reading,
 * writing and deleting keys to extended table manipulation.
 */
class AdapterNvMemory {
    constructor(znp) {
        this.memoryAlignment = null;
        this.znp = znp;
    }
    /**
     * Initialize NV memory driver by examining target and determining memory alignment.
     */
    async init() {
        /* use `ZCD_NV_NWKKEY` to determine if target platform uses memory alignment (length 21 = unaligned, length 24 = aligned) */
        const rawNwkKey = await this.readItem(common_1.NvItemsIds.NWKKEY);
        this.memoryAlignment = rawNwkKey.length === 21 ? "unaligned" : "aligned";
    }
    async readItem(id, offset = 0, useStruct) {
        var _a, _b, _c;
        if (useStruct) {
            this.checkMemoryAlignmentSetup();
        }
        const lengthResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvLength", { id }));
        if (!((_a = lengthResponse === null || lengthResponse === void 0 ? void 0 : lengthResponse.payload) === null || _a === void 0 ? void 0 : _a.length) || ((_b = lengthResponse === null || lengthResponse === void 0 ? void 0 : lengthResponse.payload) === null || _b === void 0 ? void 0 : _b.length) === 0) {
            return null;
        }
        const length = lengthResponse.payload.length;
        const buffer = Buffer.alloc(length);
        while (offset < length) {
            const readResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvReadExt", { id, offset }));
            /* istanbul ignore next */
            if (!readResponse) {
                return null;
            }
            /* istanbul ignore next */
            if (((_c = readResponse.payload) === null || _c === void 0 ? void 0 : _c.status) !== 0) {
                throw new Error(`Received non-success status while reading NV (id=${id}, offset=${offset}, status=${readResponse.payload.status})`);
            }
            buffer.set(readResponse.payload.value, offset);
            offset += readResponse.payload.value.length;
        }
        if (useStruct) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return useStruct(buffer, this.memoryAlignment);
        }
        return buffer;
    }
    /**
     * Writes data to adapter NV memory. Method fails if write fails.
     *
     * @param id NV item identifier.
     * @param data Data to be written.
     * @param offset Offset within NV item to write the data.
     * @param autoInit Whether NV item should be automatically initialized if not present.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async writeItem(id, data, offset = 0, autoInit = true) {
        this.checkMemoryAlignmentSetup();
        const buffer = Buffer.isBuffer(data) ? data : data.serialize(this.memoryAlignment);
        const lengthResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvLength", { id }));
        const exists = lengthResponse.payload.length && lengthResponse.payload.length > 0;
        /* istanbul ignore next */
        if (!exists) {
            const initLength = buffer.length > 240 ? 240 : buffer.length;
            if (!autoInit) {
                throw new Error(`Cannot write NV memory item which does not exist (id=${id})`);
            }
            const initResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvItemInit", { id, len: buffer.length, initlen: initLength, initvalue: buffer.slice(0, initLength) }, undefined, null, [common_1.ZnpCommandStatus.SUCCESS, common_1.ZnpCommandStatus.NV_ITEM_INITIALIZED]));
            if (initResponse.payload.status !== 0x09) {
                throw new Error(`Failed to initialize NV memory item (id=${id}, name=${common_1.NvItemsIds[id]}, len=${buffer.length}, status=${initResponse.payload.status})`);
            }
        }
        let remaining = buffer.length;
        while (remaining > 0) {
            /* istanbul ignore next */
            const writeLength = remaining > 240 ? 240 : remaining;
            const dataOffset = buffer.length - remaining;
            const writeData = buffer.slice(dataOffset, dataOffset + writeLength);
            const writeResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvWriteExt", { id, offset: dataOffset, len: writeLength, value: writeData }));
            /* istanbul ignore next */
            if (writeResponse.payload.status !== 0) {
                throw new Error(`Received non-success status while writing NV (id=${id}, offset=${offset}, status=${writeResponse.payload.status})`);
            }
            remaining -= writeLength;
        }
    }
    /**
     * Determines whether NV item is different from provided data and updates if necessary.
     *
     * @param id NV item identifier.
     * @param data Desired NV item value.
     * @param autoInit Whether NV item should be automatically initialized if not present.
     */
    async updateItem(id, data, autoInit = true) {
        this.checkMemoryAlignmentSetup();
        const current = await this.readItem(id);
        if (!current || !current.equals(data)) {
            await this.writeItem(id, data, 0, autoInit);
        }
    }
    /**
     * Deletes an NV memory item.
     *
     * @param id NV item identifier.
     */
    async deleteItem(id) {
        this.checkMemoryAlignmentSetup();
        const lengthResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvLength", { id }));
        const exists = lengthResponse.payload.length && lengthResponse.payload.length > 0;
        /* istanbul ignore next */
        if (exists) {
            const deleteResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "osalNvDelete", { id, len: lengthResponse.payload.length }));
            if (!deleteResponse || ![common_1.ZnpCommandStatus.SUCCESS, common_1.ZnpCommandStatus.NV_ITEM_INITIALIZED].includes(deleteResponse.payload.status)) {
                /* istanbul ignore next */
                throw new Error(`Received non-success status while deleting NV (id=${id}, status=${deleteResponse.payload.status})`);
            }
        }
    }
    async readExtendedTableEntry(sysId, id, subId, offset, useStruct) {
        this.checkMemoryAlignmentSetup();
        const lengthResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "nvLength", { sysid: sysId, itemid: id, subid: subId }));
        const exists = lengthResponse.payload.len && lengthResponse.payload.len > 0;
        if (exists) {
            const readResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "nvRead", { sysid: sysId, itemid: id, subid: subId, offset: offset || 0, len: lengthResponse.payload.len }));
            /* istanbul ignore next */
            if (readResponse.payload.status !== 0) {
                throw new Error(`Received non-success status while reading NV extended table entry (sysId=${sysId}, id=${id}, subId=${subId}, offset=${offset}, status=${readResponse.payload.status})`);
            }
            /* istanbul ignore next */
            if (useStruct) {
                return useStruct(readResponse.payload.value);
            }
            else {
                return readResponse.payload.value;
            }
        }
        return null;
    }
    /**
     * Writes extended table entry (user by Z-Stack 3.x+). NV tables within newer Z-Stack releases include 16-bit `subId`
     * identifying table tnreis.
     *
     * @param sysId SimpleLink system identifier.
     * @param id NV item identifier.
     * @param subId Entry index.
     * @param data Data to write to the table.
     * @param offset Offset to write at.
     * @param autoInit Whether non-existent entry should be automatically initialized.
     */
    async writeExtendedTableEntry(sysId, id, subId, data, offset, autoInit = true) {
        this.checkMemoryAlignmentSetup();
        const lengthResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "nvLength", { sysid: sysId, itemid: id, subid: subId }));
        const exists = lengthResponse.payload.len && lengthResponse.payload.len > 0;
        /* istanbul ignore if */
        if (!exists) {
            if (!autoInit) {
                throw new Error(`Cannot write NV memory extended table item which does not exist (sudId=${sysId}, id=${id}, subId=${subId})`);
            }
            const createResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "nvCreate", { sysid: sysId, itemid: id, subid: subId, len: data.length }));
            if (!createResponse || createResponse.payload.status !== common_1.ZnpCommandStatus.SUCCESS) {
                /* istanbul ignore next */
                throw new Error(`Failed to crate NV memory extended table item with status (sudId=${sysId}, id=${id}, subId=${subId})`);
            }
        }
        const writeResponse = await this.retry(() => this.znp.request(constants_1.Subsystem.SYS, "nvWrite", { sysid: sysId, itemid: id, subid: subId, offset: offset || 0, len: data.length, value: data }));
        /* istanbul ignore next */
        if (writeResponse.payload.status !== 0) {
            throw new Error(`Received non-success status while writing NV extended table idem (sudId=${sysId}, id=${id}, subId=${subId}, offset=${offset}, status=${writeResponse.payload.status})`);
        }
    }
    async readTable(mode, p1, p2, p3, p4) {
        const sysId = mode === "legacy" ? undefined : p1;
        const id = (mode === "legacy" ? p1 : p2);
        const maxLength = (mode === "legacy" ? p2 : p3);
        const useTable = (mode === "legacy" ? p3 : p4);
        const rawEntries = [];
        let entryOffset = 0;
        let rawEntry = null;
        if (mode === "legacy") {
            do {
                rawEntry = await this.readItem(id + (entryOffset++));
                if (rawEntry) {
                    rawEntries.push(rawEntry);
                }
            } while (rawEntry !== null && entryOffset < maxLength);
        }
        else {
            /* istanbul ignore next */
            do {
                rawEntry = await this.readExtendedTableEntry(sysId, id, entryOffset++);
                if (rawEntry) {
                    rawEntries.push(rawEntry);
                }
            } while (rawEntry !== null && (!maxLength || entryOffset < maxLength));
        }
        /* istanbul ignore next */
        return useTable ? useTable(rawEntries) : rawEntries;
    }
    async writeTable(mode, p1, p2, p3) {
        this.checkMemoryAlignmentSetup();
        const sysId = mode === "legacy" ? undefined : p1;
        const id = (mode === "legacy" ? p1 : p2);
        const table = (mode === "legacy" ? p2 : p3);
        if (mode === "legacy") {
            for (const [index, entry] of table.entries.entries()) {
                await this.writeItem(id + index, entry.serialize(this.memoryAlignment));
            }
        }
        else {
            for (const [index, entry] of table.entries.entries()) {
                await this.writeExtendedTableEntry(sysId, id, index, entry.serialize(this.memoryAlignment));
            }
        }
    }
    /**
     * Internal function to prevent occasional ZNP request failures.
     *
     * *Some timeouts were present when working with SimpleLink Z-Stack 3.x.0+.*
     *
     * @param fn Function to retry.
     * @param retries Maximum number of retries.
     */
    async retry(fn, retries = 3) {
        let i = 0;
        while (i < retries) {
            try {
                const result = await fn();
                return result;
            }
            catch (error) {
                /* istanbul ignore next */
                if (i >= retries) {
                    /* istanbul ignore next */
                    throw error;
                }
            }
            /* istanbul ignore next */
            i++;
        }
    }
    /**
     * Internal function used by NV manipulation methods to check for correct driver initialization.
     */
    checkMemoryAlignmentSetup() {
        /* istanbul ignore next */
        if (this.memoryAlignment === null) {
            throw new Error("adapter memory alignment unknown - has nv memory driver been initialized?");
        }
    }
}
exports.AdapterNvMemory = AdapterNvMemory;
//# sourceMappingURL=adapter-nv-memory.js.map