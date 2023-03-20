"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
class Buffalo {
    constructor(buffer, position = 0) {
        this.position = position;
        this.buffer = buffer;
    }
    getPosition() {
        return this.position;
    }
    getBuffer() {
        return this.buffer;
    }
    getWritten() {
        return this.buffer.slice(0, this.position);
    }
    isMore() {
        return this.position < this.buffer.length;
    }
    writeInt8(value) {
        this.buffer.writeInt8(value, this.position);
        this.position++;
    }
    readInt8() {
        const value = this.buffer.readInt8(this.position);
        this.position++;
        return value;
    }
    writeUInt8(value) {
        this.buffer.writeUInt8(value, this.position);
        this.position++;
    }
    readUInt8() {
        const value = this.buffer.readUInt8(this.position);
        this.position++;
        return value;
    }
    writeUInt16(value) {
        this.buffer.writeUInt16LE(value, this.position);
        this.position += 2;
    }
    readUInt24() {
        const value = this.buffer.readUIntLE(this.position, 3);
        this.position += 3;
        return value;
    }
    writeUInt24(value) {
        this.buffer.writeUIntLE(value, this.position, 3);
        this.position += 3;
    }
    readInt24() {
        const value = this.buffer.readIntLE(this.position, 3);
        this.position += 3;
        return value;
    }
    writeInt24(value) {
        this.buffer.writeIntLE(value, this.position, 3);
        this.position += 3;
    }
    readUInt16() {
        const value = this.buffer.readUInt16LE(this.position);
        this.position += 2;
        return value;
    }
    writeInt16(value) {
        this.buffer.writeInt16LE(value, this.position);
        this.position += 2;
    }
    readInt16() {
        const value = this.buffer.readInt16LE(this.position);
        this.position += 2;
        return value;
    }
    writeUInt32(value) {
        this.buffer.writeUInt32LE(value, this.position);
        this.position += 4;
    }
    readUInt32() {
        const value = this.buffer.readUInt32LE(this.position);
        this.position += 4;
        return value;
    }
    writeInt32(value) {
        this.buffer.writeInt32LE(value, this.position);
        this.position += 4;
    }
    readInt32() {
        const value = this.buffer.readInt32LE(this.position);
        this.position += 4;
        return value;
    }
    writeFloatLE(value) {
        this.buffer.writeFloatLE(value, this.position);
        this.position += 4;
    }
    readFloatLE() {
        const value = this.buffer.readFloatLE(this.position);
        this.position += 4;
        return value;
    }
    writeDoubleLE(value) {
        this.buffer.writeDoubleLE(value, this.position);
        this.position += 8;
    }
    readDoubleLE() {
        const value = this.buffer.readDoubleLE(this.position);
        this.position += 8;
        return value;
    }
    writeIeeeAddr(value) {
        this.writeUInt32(parseInt(value.slice(10), 16));
        this.writeUInt32(parseInt(value.slice(2, 10), 16));
    }
    readIeeeAddr() {
        const octets = Array.from(this.readBuffer(8).reverse());
        return '0x' + octets.map(octet => octet.toString(16).padStart(2, '0')).join("");
    }
    readBuffer(length) {
        const value = this.buffer.slice(this.position, this.position + length);
        this.position += length;
        return value;
    }
    writeBuffer(values, length) {
        if (values.length !== length) {
            throw new Error(`Length of values: '${values}' is not consitent with expected length '${length}'`);
        }
        if (!(values instanceof Buffer)) {
            values = Buffer.from(values);
        }
        this.position += values.copy(this.buffer, this.position);
    }
    writeListUInt8(values) {
        for (const value of values) {
            this.writeUInt8(value);
        }
    }
    readListUInt8(options) {
        const value = [];
        for (let i = 0; i < options.length; i++) {
            value.push(this.readUInt8());
        }
        return value;
    }
    writeListUInt16(values) {
        for (const value of values) {
            this.writeUInt16(value);
        }
    }
    readListUInt16(options) {
        const value = [];
        for (let i = 0; i < options.length; i++) {
            value.push(this.readUInt16());
        }
        return value;
    }
    writeListUInt24(values) {
        for (const value of values) {
            this.writeUInt24(value);
        }
    }
    readListUInt24(options) {
        const value = [];
        for (let i = 0; i < options.length; i++) {
            value.push(this.readUInt24());
        }
        return value;
    }
    writeListUInt32(values) {
        for (const value of values) {
            this.writeUInt32(value);
        }
    }
    readListUInt32(options) {
        const value = [];
        for (let i = 0; i < options.length; i++) {
            value.push(this.readUInt32());
        }
        return value;
    }
    readUtf8String(length) {
        const value = this.buffer.toString('utf8', this.position, this.position + length);
        this.position += length;
        return value;
    }
    writeUtf8String(value) {
        this.position += this.buffer.write(value, this.position, 'utf8');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    write(type, value, options) {
        if (type === 'UINT8') {
            this.writeUInt8(value);
        }
        else if (type === 'UINT16') {
            this.writeUInt16(value);
        }
        else if (type === 'UINT32') {
            this.writeUInt32(value);
        }
        else if (type === 'IEEEADDR') {
            this.writeIeeeAddr(value);
        }
        else if (type.startsWith('BUFFER') && (Buffer.isBuffer(value) || utils_1.IsNumberArray(value))) {
            let length = Number(type.replace('BUFFER', ''));
            length = length != 0 ? length : value.length;
            this.writeBuffer(value, length);
        }
        else if (type === 'INT8') {
            this.writeInt8(value);
        }
        else if (type === 'INT16') {
            this.writeInt16(value);
        }
        else if (type === 'UINT24') {
            this.writeUInt24(value);
        }
        else if (type === 'INT24') {
            this.writeInt24(value);
        }
        else if (type === 'INT32') {
            this.writeInt32(value);
        }
        else if (type === 'FLOATLE') {
            this.writeFloatLE(value);
        }
        else if (type === 'DOUBLELE') {
            this.writeDoubleLE(value);
        }
        else if (type === 'EMPTY') {
            /* nothing to write */
        }
        else if (type === 'LIST_UINT8') {
            this.writeListUInt8(value);
        }
        else if (type === 'LIST_UINT16') {
            this.writeListUInt16(value);
        }
        else if (type === 'LIST_UINT24') {
            this.writeListUInt24(value);
        }
        else if (type === 'LIST_UINT32') {
            this.writeListUInt32(value);
        }
        else {
            throw new Error(`Write for '${type}' not available`);
        }
    }
    read(type, options) {
        if (type === 'UINT8') {
            return this.readUInt8();
        }
        else if (type === 'UINT16') {
            return this.readUInt16();
        }
        else if (type === 'UINT32') {
            return this.readUInt32();
        }
        else if (type === 'IEEEADDR') {
            return this.readIeeeAddr();
        }
        else if (type.startsWith('BUFFER')) {
            let length = Number(type.replace('BUFFER', ''));
            length = length != 0 ? length : options.length;
            return this.readBuffer(length);
        }
        else if (type === 'INT8') {
            return this.readInt8();
        }
        else if (type === 'INT16') {
            return this.readInt16();
        }
        else if (type === 'UINT24') {
            return this.readUInt24();
        }
        else if (type === 'INT24') {
            return this.readInt24();
        }
        else if (type === 'INT32') {
            return this.readInt32();
        }
        else if (type === 'FLOATLE') {
            return this.readFloatLE();
        }
        else if (type === 'DOUBLELE') {
            return this.readDoubleLE();
        }
        else if (type === 'EMPTY') {
            return null;
        }
        else if (type === 'LIST_UINT8') {
            return this.readListUInt8(options);
        }
        else if (type === 'LIST_UINT16') {
            return this.readListUInt16(options);
        }
        else if (type === 'LIST_UINT24') {
            return this.readListUInt24(options);
        }
        else if (type === 'LIST_UINT32') {
            return this.readListUInt32(options);
        }
        else {
            throw new Error(`Read for '${type}' not available`);
        }
    }
}
exports.default = Buffalo;
//# sourceMappingURL=buffalo.js.map