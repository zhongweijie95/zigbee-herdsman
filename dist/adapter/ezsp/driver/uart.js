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
exports.SerialDriver = void 0;
/* istanbul ignore file */
const events_1 = require("events");
const serialport_1 = __importDefault(require("serialport"));
const net_1 = __importDefault(require("net"));
const socketPortUtils_1 = __importDefault(require("../../socketPortUtils"));
const utils_1 = require("./utils");
const stream = __importStar(require("stream"));
const utils_2 = require("../../../utils");
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default('zigbee-herdsman:adapter:ezsp:uart');
const FLAG = 0x7E; // Marks end of frame
const ESCAPE = 0x7D; // Indicates that the following byte is escaped
const CANCEL = 0x1A; // Terminates a frame in progress
const XON = 0x11; // Resume transmission
const XOFF = 0x13; // Stop transmission
const SUBSTITUTE = 0x18; // Replaces a byte received with a low-level communication error
const STUFF = 0x20;
const RESERVED = [FLAG, ESCAPE, XON, XOFF, SUBSTITUTE, CANCEL];
const RANDOMIZE_START = 0x42;
const RANDOMIZE_SEQ = 0xB8;
var NcpResetCode;
(function (NcpResetCode) {
    NcpResetCode[NcpResetCode["RESET_UNKNOWN_REASON"] = 0] = "RESET_UNKNOWN_REASON";
    NcpResetCode[NcpResetCode["RESET_EXTERNAL"] = 1] = "RESET_EXTERNAL";
    NcpResetCode[NcpResetCode["RESET_POWER_ON"] = 2] = "RESET_POWER_ON";
    NcpResetCode[NcpResetCode["RESET_WATCHDOG"] = 3] = "RESET_WATCHDOG";
    NcpResetCode[NcpResetCode["RESET_ASSERT"] = 6] = "RESET_ASSERT";
    NcpResetCode[NcpResetCode["RESET_BOOTLOADER"] = 9] = "RESET_BOOTLOADER";
    NcpResetCode[NcpResetCode["RESET_SOFTWARE"] = 11] = "RESET_SOFTWARE";
    NcpResetCode[NcpResetCode["ERROR_EXCEEDED_MAXIMUM_ACK_TIMEOUT_COUNT"] = 81] = "ERROR_EXCEEDED_MAXIMUM_ACK_TIMEOUT_COUNT";
    NcpResetCode[NcpResetCode["ERROR_UNKNOWN_EM3XX_ERROR"] = 128] = "ERROR_UNKNOWN_EM3XX_ERROR";
})(NcpResetCode || (NcpResetCode = {}));
class Parser extends stream.Transform {
    constructor() {
        super();
        this.buffer = Buffer.from([]);
    }
    _transform(chunk, _, cb) {
        //debug(`<-- [${[...chunk]}]`);
        if (chunk.indexOf(CANCEL) >= 0) {
            this.buffer = Buffer.from([]);
            chunk = chunk.slice((chunk.lastIndexOf(CANCEL) + 1));
        }
        if (chunk.indexOf(SUBSTITUTE) >= 0) {
            this.buffer = Buffer.from([]);
            chunk = chunk.slice((chunk.indexOf(FLAG) + 1));
        }
        this.buffer = Buffer.concat([this.buffer, chunk]);
        this.parseNext();
        cb();
    }
    parseNext() {
        //debug(`--- parseNext [${[...this.buffer]}]`);
        if (this.buffer.length && this.buffer.indexOf(FLAG) >= 0) {
            debug(`<-- [${this.buffer.toString('hex')}] [${[...this.buffer]}]`);
            try {
                const frame = this.extract_frame();
                if (frame) {
                    this.emit('parsed', frame);
                }
            }
            catch (error) {
                debug(`<-- error ${error.stack}`);
            }
            this.parseNext();
        }
    }
    extract_frame() {
        /* Extract a frame from the data buffer */
        const place = this.buffer.indexOf(FLAG);
        if (place >= 0) {
            // todo: check crc data
            const result = this.unstuff(this.buffer.slice(0, (place + 1)));
            this.buffer = this.buffer.slice((place + 1));
            return result;
        }
        else {
            return null;
        }
    }
    unstuff(s) {
        /* Unstuff (unescape) a string after receipt */
        let escaped = false;
        const out = Buffer.alloc(s.length);
        let outIdx = 0;
        for (let idx = 0; idx < s.length; idx += 1) {
            const c = s[idx];
            if (escaped) {
                out.writeUInt8(c ^ STUFF, outIdx++);
                escaped = false;
            }
            else {
                if ((c === ESCAPE)) {
                    escaped = true;
                }
                else {
                    out.writeUInt8(c, outIdx++);
                }
            }
        }
        return out;
    }
}
class Writer extends stream.Readable {
    writeBuffer(buffer) {
        debug(`--> [${buffer.toString('hex')}] [${[...buffer]}]`);
        this.push(buffer);
    }
    _read() {
    }
    stuff(s) {
        /* Byte stuff (escape) a string for transmission */
        const out = Buffer.alloc(256);
        let outIdx = 0;
        for (const c of s) {
            if (RESERVED.includes(c)) {
                out.writeUInt8(ESCAPE, outIdx++);
                out.writeUInt8(c ^ STUFF, outIdx++);
            }
            else {
                out.writeUInt8(c, outIdx++);
            }
        }
        return out.slice(0, outIdx);
    }
}
class SerialDriver extends events_1.EventEmitter {
    constructor() {
        super();
        this.sendSeq = 0; // next frame number to send
        this.recvSeq = 0; // next frame number to receive
        this.ackSeq = 0; // next number after the last accepted frame
        this.initialized = false;
        this.queue = new utils_2.Queue();
        this.waitress = new utils_2.Waitress(this.waitressValidator, this.waitressTimeoutFormatter);
    }
    async connect(path, options) {
        this.portType = socketPortUtils_1.default.isTcpPath(path) ? 'socket' : 'serial';
        if (this.portType === 'serial') {
            await this.openSerialPort(path, options);
        }
        else {
            await this.openSocketPort(path);
        }
    }
    async openSerialPort(path, opt) {
        const options = {
            baudRate: typeof opt.baudRate === 'number' ? opt.baudRate : 115200,
            rtscts: typeof opt.rtscts === 'boolean' ? opt.rtscts : false,
            autoOpen: false
        };
        debug(`Opening SerialPort with ${path} and ${JSON.stringify(options)}`);
        this.serialPort = new serialport_1.default(path, options);
        this.writer = new Writer();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.writer.pipe(this.serialPort);
        this.parser = new Parser();
        this.serialPort.pipe(this.parser);
        this.parser.on('parsed', this.onParsed.bind(this));
        return new Promise((resolve, reject) => {
            this.serialPort.open(async (error) => {
                if (error) {
                    reject(new Error(`Error while opening serialport '${error}'`));
                    this.initialized = false;
                    if (this.serialPort.isOpen) {
                        this.serialPort.close();
                    }
                }
                else {
                    debug('Serialport opened');
                    this.serialPort.once('close', this.onPortClose.bind(this));
                    this.serialPort.once('error', (error) => {
                        debug(`Serialport error: ${error}`);
                    });
                    // reset
                    await this.reset();
                    this.initialized = true;
                    this.emit('connected');
                    resolve();
                }
            });
        });
    }
    async openSocketPort(path) {
        const info = socketPortUtils_1.default.parseTcpPath(path);
        debug(`Opening TCP socket with ${info.host}:${info.port}`);
        this.socketPort = new net_1.default.Socket();
        this.socketPort.setNoDelay(true);
        this.socketPort.setKeepAlive(true, 15000);
        this.writer = new Writer();
        this.writer.pipe(this.socketPort);
        this.parser = new Parser();
        this.socketPort.pipe(this.parser);
        this.parser.on('parsed', this.onParsed.bind(this));
        return new Promise((resolve, reject) => {
            this.socketPort.on('connect', function () {
                debug('Socket connected');
            });
            // eslint-disable-next-line
            const self = this;
            this.socketPort.on('ready', async () => {
                debug('Socket ready');
                // reset
                await this.reset();
                self.initialized = true;
                this.emit('connected');
                resolve();
            });
            this.socketPort.once('close', this.onPortClose.bind(this));
            this.socketPort.on('error', function () {
                debug('Socket error');
                reject(new Error(`Error while opening socket`));
                self.initialized = false;
            });
            this.socketPort.connect(info.port, info.host);
        });
    }
    onParsed(data) {
        try {
            /* Frame receive handler */
            switch (true) {
                case ((data[0] & 0x80) === 0):
                    debug(`Recv DATA frame (${(data[0] & 0x70) >> 4},` +
                        `${data[0] & 0x07},${(data[0] & 0x08) >> 3}): ${data.toString('hex')}`);
                    this.handleDATA(data);
                    break;
                case ((data[0] & 0xE0) === 0x80):
                    debug(`Recv ACK  frame (${data[0] & 0x07}): ${data.toString('hex')}`);
                    this.handleACK(data[0]);
                    break;
                case ((data[0] & 0xE0) === 0xA0):
                    debug(`Recv NAK  frame (${data[0] & 0x07}): ${data.toString('hex')}`);
                    this.handleNAK(data[0]);
                    break;
                case (data[0] === 0xC0):
                    debug(`Recv RST  frame: ${data.toString('hex')}`);
                    break;
                case (data[0] === 0xC1):
                    debug(`RSTACK frame: ${data.toString('hex')}`);
                    this.rstack_frame_received(data);
                    break;
                case (data[0] === 0xC2):
                    debug(`Error frame : ${data.toString('hex')}`);
                    break;
                default:
                    debug("UNKNOWN FRAME RECEIVED: %r", data);
            }
        }
        catch (error) {
            debug(`Error while parsing to ZpiObject '${error.stack}'`);
        }
    }
    handleDATA(data) {
        /* Data frame receive handler */
        const frmNum = (data[0] & 0x70) >> 4;
        //const ackNum = data[0] & 0x07;
        //const reTx = (data[0] & 0x08) >> 3;
        // if (seq !== this.recvSeq) {
        //     debug('NAK-NAK');
        // }
        this.recvSeq = (frmNum + 1) & 7; // next
        this.sendACK(this.recvSeq);
        this.handleACK(data[0]);
        data = data.slice(1, (-3));
        const frame = this.randomize(data);
        this.emit('received', frame);
    }
    handleACK(control) {
        /* Handle an acknowledgement frame */
        // next number after the last accepted frame
        this.ackSeq = control & 0x07;
        // const handled = this.waitress.resolve({sequence: this.ackSeq});
        // if (!handled) {
        //     debug(`Unexpected packet sequence ${this.ackSeq}`);
        // } else {
        //     debug(`Expected packet sequence ${this.ackSeq}`);
        // }
        // var ack, pending;
        // ack = (((control & 7) - 1) % 8);
        // if ((ack === this._pending[0])) {
        //     [pending, this._pending] = [this._pending, [(- 1), null]];
        //     pending[1].set_result(true);
        // }
    }
    handleNAK(control) {
        /* Handle negative acknowledgment frame */
        const nakNum = control & 0x07;
        const handled = this.waitress.reject({ sequence: nakNum }, 'Recv NAK frame');
        if (!handled) {
            // send NAK
            debug(`NAK Unexpected packet sequence ${nakNum}`);
        }
        else {
            debug(`NAK Expected packet sequence ${nakNum}`);
        }
        // if ((nak === this._pending[0])) {
        //     this._pending[1].set_result(false);
        // }
    }
    rstack_frame_received(data) {
        /* Reset acknowledgement frame receive handler */
        let code;
        this.sendSeq = 0;
        this.recvSeq = 0;
        try {
            code = NcpResetCode[data[2]];
        }
        catch (e) {
            code = NcpResetCode.ERROR_UNKNOWN_EM3XX_ERROR;
        }
        debug("RSTACK Version: %d Reason: %s frame: %s", data[1], code.toString(), data.toString('hex'));
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        if (NcpResetCode[code].toString() !== NcpResetCode.RESET_SOFTWARE.toString()) {
            return;
        }
        if ((!this.resetDeferred)) {
            debug("Reset future is None");
            return;
        }
        this.resetDeferred.resolve(true);
    }
    make_frame(control, data) {
        /* Construct a frame */
        const ctrlArr = Array.from(control);
        const dataArr = (data && Array.from(data)) || [];
        const sum = ctrlArr.concat(dataArr);
        const crc = utils_1.crc16ccitt(Buffer.from(sum), 65535);
        const crcArr = [(crc >> 8), (crc % 256)];
        return Buffer.concat([this.writer.stuff(sum.concat(crcArr)), Buffer.from([FLAG])]);
    }
    randomize(s) {
        /*XOR s with a pseudo-random sequence for transmission
        Used only in data frames
        */
        let rand = RANDOMIZE_START;
        const out = Buffer.alloc(s.length);
        let outIdx = 0;
        for (const c of s) {
            out.writeUInt8(c ^ rand, outIdx++);
            if ((rand % 2)) {
                rand = ((rand >> 1) ^ RANDOMIZE_SEQ);
            }
            else {
                rand = (rand >> 1);
            }
        }
        return out;
    }
    makeDataFrame(data, seq, rxmit, ackSeq) {
        /* Construct a data frame */
        const control = (((seq << 4) | (rxmit << 3)) | ackSeq);
        return this.make_frame([control], this.randomize(data));
    }
    async reset() {
        // return this._gw.reset();
        debug('uart reseting');
        if ((this.resetDeferred)) {
            throw new TypeError("reset can only be called on a new connection");
        }
        /* Construct a reset frame */
        const rst_frame = Buffer.concat([Buffer.from([CANCEL]), this.make_frame([0xC0])]);
        debug(`Write reset`);
        this.resetDeferred = new utils_1.Deferred();
        this.writer.writeBuffer(rst_frame);
        return this.resetDeferred.promise;
    }
    close() {
        return new Promise((resolve, reject) => {
            if (this.initialized) {
                if (this.portType === 'serial') {
                    this.serialPort.flush(() => {
                        this.serialPort.close((error) => {
                            this.initialized = false;
                            error == null ?
                                resolve() :
                                reject(new Error(`Error while closing serialport '${error}'`));
                            this.emit('close');
                        });
                    });
                }
                else {
                    this.socketPort.destroy();
                    resolve();
                }
            }
            else {
                resolve();
                this.emit('close');
            }
        });
    }
    onPortClose() {
        debug('Port closed');
        this.resetDeferred = undefined;
        this.initialized = false;
        this.emit('close');
    }
    isInitialized() {
        return this.initialized;
    }
    sendACK(ackNum) {
        /* Construct a acknowledgement frame */
        const ackFrame = this.make_frame([(0b10000000 | ackNum)]);
        debug(`Send ACK  frame (${ackNum})`);
        this.writer.writeBuffer(ackFrame);
    }
    async sendDATA(data) {
        const seq = this.sendSeq;
        this.sendSeq = ((seq + 1) % 8); // next
        const nextSeq = this.sendSeq;
        const ackSeq = this.recvSeq;
        let pack;
        return this.queue.execute(async () => {
            debug(`Send DATA frame (${seq},${ackSeq},0): ${data.toString('hex')}`);
            pack = this.makeDataFrame(data, seq, 0, ackSeq);
            // const waiter = this.waitFor(nextSeq).start();
            debug(`waiting (${nextSeq})`);
            this.writer.writeBuffer(pack);
            // await waiter.promise.catch(async () => {
            //     debug(`break waiting (${nextSeq})`);
            //     debug(`Can't send DATA frame (${seq},${ackSeq},0): ${data.toString('hex')}`);
            //     debug(`Resend DATA frame (${seq},${ackSeq},1): ${data.toString('hex')}`);
            //     pack = this.makeDataFrame(data, seq, 1, ackSeq);
            //     const waiter = this.waitFor(nextSeq).start();
            //     debug(`rewaiting (${nextSeq})`);
            //     this.writer.writeBuffer(pack);
            //     await waiter.promise.catch((e) => {
            //         debug(`break rewaiting (${nextSeq})`);
            //         debug(`Can't resend DATA frame (${seq},${ackSeq},1): ${data.toString('hex')}`);
            //         throw new Error(`sendDATA error: ${e}`);
            //     });
            //     debug(`rewaiting (${nextSeq}) success`);
            // });
            debug(`waiting (${nextSeq}) success`);
        });
        // try {
        //     debug(`Send DATA frame (${seq},${this.recvSeq},0): ${data.toString('hex')}`);
        //     pack = this.data_frame(data, seq, 0);
        //     this.writer.writeBuffer(pack);
        // } catch (e) {
        //     debug(`Send DATA frame (${seq},${this.recvSeq},1): ${data.toString('hex')}`);
        //     pack = this.data_frame(data, seq, 1);
        //     this.writer.writeBuffer(pack);
        // }
    }
    waitFor(sequence, timeout = 10000) {
        return this.waitress.waitFor({ sequence }, timeout);
    }
    waitressTimeoutFormatter(matcher, timeout) {
        return `${JSON.stringify(matcher)} after ${timeout}ms`;
    }
    waitressValidator(payload, matcher) {
        return (payload.sequence === matcher.sequence);
    }
}
exports.SerialDriver = SerialDriver;
//# sourceMappingURL=uart.js.map