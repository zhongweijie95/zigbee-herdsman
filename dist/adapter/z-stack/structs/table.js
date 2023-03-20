"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Table = void 0;
/**
 * Table structure wraps `Struct`-based entries for tables present within ZNP NV memory.
 */
class Table {
    constructor() {
        this.hasInlineLengthHeader = false;
        this.entryOccupancyFunction = null;
    }
    /**
     * Create a new table builder.
     */
    static new() {
        return new Table();
    }
    /**
     * Return total capacity of the table.
     */
    get capacity() {
        return this.data.length;
    }
    /**
     * Returns all entries within table.
     */
    get entries() {
        return this.data;
    }
    /**
     * Returns all used entries.
     */
    get used() {
        /* istanbul ignore next */
        if (!this.entryOccupancyFunction) {
            throw new Error("Table usage cannot be determined without occupancy function when header is not present.");
        }
        return this.entries.filter(e => this.entryOccupancyFunction(e));
    }
    /**
     * Returns all unused entries.
     */
    get free() {
        /* istanbul ignore next */
        if (!this.entryOccupancyFunction) {
            throw new Error("Table usage cannot be determined without occupancy function when header is not present.");
        }
        return this.entries.filter(e => !this.entryOccupancyFunction(e));
    }
    /**
     * Return number of records marked as free.
     */
    get freeCount() {
        /* istanbul ignore next */
        return this.free.length;
    }
    /**
     * Return number of records marked as used.
     */
    get usedCount() {
        return this.used.length;
    }
    /**
     * Return next free entry or `null` if no entries are free within the table.
     */
    getNextFree() {
        return this.free[0] || null;
    }
    /**
     * Returns index of element in table.
     *
     * @param entry Entry to resolve index for.
     */
    indexOf(entry) {
        return this.entries.findIndex(e => e.serialize().equals(entry.serialize())) || null;
    }
    /**
     * Export the table in target platform format.
     *
     * @param alignment Memory alignment to use for export.
     */
    serialize(alignment = "unaligned") {
        const entryLength = this.emptyEntry.getLength(alignment);
        const output = Buffer.alloc((this.hasInlineLengthHeader ? 2 : 0) + (this.capacity * entryLength), 0x00);
        let offset = 0;
        if (this.hasInlineLengthHeader) {
            output.writeUInt16LE(this.usedCount);
            offset += 2;
        }
        this.data.forEach(e => {
            output.set(e.serialize(alignment), offset);
            offset += e.getLength(alignment);
        });
        return output;
    }
    /**
     * Applies function to determine table entry occupancy. This function is invoked with an entry instance
     * and returns `boolean` indicating if the entry is occupied or not.
     *
     * @param fn Function to determine entry occupancy.
     */
    occupancy(fn) {
        this.entryOccupancyFunction = fn;
        return this;
    }
    /**
     * Defines a struct factory for entries contained within table.
     *
     * @param entryStructFactory Struct factory.
     */
    struct(entryStructFactory) {
        this.entryStructFactory = entryStructFactory;
        this.emptyEntry = this.entryStructFactory();
        return this;
    }
    /**
     * Sets whether the table has a table header containing a 16-bit unsigned used table length.
     *
     * @param hasInlineHeader Sets whether table has record count header.
     */
    inlineHeader(hasInlineHeader = true) {
        this.hasInlineLengthHeader = hasInlineHeader;
        return this;
    }
    build(dataOrCapacity, alignment = "unaligned") {
        /* istanbul ignore next */
        if (!this.entryStructFactory) {
            throw new Error("Table requires an entry struct factory.");
        }
        if (Array.isArray(dataOrCapacity) && dataOrCapacity.every(e => Buffer.isBuffer(e))) {
            /* create table from given entries */
            const data = dataOrCapacity;
            if (!data.every(e => e.length === data[0].length)) {
                throw new Error("All table entries need to be the same length");
            }
            this.data = data.map(buffer => this.entryStructFactory(buffer));
        }
        else if (Buffer.isBuffer(dataOrCapacity)) {
            /* create table from inline structure */
            const data = dataOrCapacity;
            const entryLength = this.emptyEntry.getLength(alignment);
            const dataLength = this.hasInlineLengthHeader ? data.length - 2 : data.length;
            if (dataLength % entryLength !== 0) {
                throw new Error(`Table length not divisible by entry length (alignment=${alignment}, data_length=${data.length}, entry_length=${entryLength})`);
            }
            const capacity = dataLength / entryLength;
            const entriesStart = this.hasInlineLengthHeader ? data.slice(2, data.length) : data.slice();
            this.data = [...Array(capacity)].map((_, i) => this.entryStructFactory(entriesStart.slice(i * entryLength, i * entryLength + entryLength)));
        }
        else if (typeof dataOrCapacity === "number") {
            /* create empty table of given capacity */
            const capacity = dataOrCapacity;
            this.data = [...Array(capacity)].map(() => this.entryStructFactory());
        }
        else {
            throw new Error("Unsupported table data source");
        }
        return this;
    }
}
exports.Table = Table;
//# sourceMappingURL=table.js.map