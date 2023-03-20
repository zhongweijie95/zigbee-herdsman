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
const Zcl = __importStar(require("../zcl"));
const crypto_1 = __importDefault(require("crypto"));
const zclTransactionSequenceNumber_1 = __importDefault(require("./helpers/zclTransactionSequenceNumber"));
const events_1 = __importDefault(require("events"));
const tstype_1 = require("./tstype");
const zigBeeLinkKey = Buffer.from([
    0x5A, 0x69, 0x67, 0x42, 0x65, 0x65, 0x41, 0x6C, 0x6C, 0x69, 0x61, 0x6E, 0x63, 0x65, 0x30, 0x39
]);
class GreenPower extends events_1.default.EventEmitter {
    constructor(adapter) {
        super();
        this.adapter = adapter;
    }
    encryptSecurityKey(sourceID, securityKey) {
        const sourceIDInBytes = Buffer.from([
            (sourceID & 0x000000ff),
            (sourceID & 0x0000ff00) >> 8,
            (sourceID & 0x00ff0000) >> 16,
            (sourceID & 0xff000000) >> 24
        ]);
        const nonce = Buffer.alloc(13);
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 4; j++) {
                nonce[4 * i + j] = sourceIDInBytes[j];
            }
        }
        nonce[12] = 0x05;
        const cipher = crypto_1.default.createCipheriv('aes-128-ccm', zigBeeLinkKey, nonce, { authTagLength: 16 });
        const encrypted = cipher.update(securityKey);
        return Buffer.concat([encrypted, cipher.final()]);
    }
    async onZclGreenPowerData(dataPayload) {
        if (dataPayload.frame.Payload.commandID === 224 && typeof dataPayload.address === 'number') {
            const key = this.encryptSecurityKey(dataPayload.frame.Payload.srcID, dataPayload.frame.Payload.commandFrame.securityKey);
            if (dataPayload.wasBroadcast) {
                const payload = {
                    options: 0x00e548,
                    srcID: dataPayload.frame.Payload.srcID,
                    sinkGroupID: this.adapter.greenPowerGroup,
                    deviceID: dataPayload.frame.Payload.commandFrame.deviceID,
                    frameCounter: dataPayload.frame.Payload.commandFrame.outgoingCounter,
                    gpdKey: [...key],
                };
                const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'pairing', 33, payload);
                await this.adapter.sendZclFrameToAll(242, frame, 242);
            }
            else {
                const coordinator = await this.adapter.getCoordinator();
                const payload = {
                    options: 0x00e568,
                    srcID: dataPayload.frame.Payload.srcID,
                    sinkIEEEAddr: coordinator.ieeeAddr,
                    sinkNwkAddr: coordinator.networkAddress,
                    deviceID: dataPayload.frame.Payload.commandFrame.deviceID,
                    frameCounter: dataPayload.frame.Payload.commandFrame.outgoingCounter,
                    gpdKey: [...key],
                };
                const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'pairing', 33, payload);
                await this.adapter.sendZclFrameToEndpoint(null, dataPayload.frame.Payload.gppNwkAddr, 242, frame, 10000, false, false, 242);
            }
            const eventData = {
                sourceID: dataPayload.frame.Payload.srcID,
                deviceID: dataPayload.frame.Payload.commandFrame.deviceID,
                networkAddress: dataPayload.frame.Payload.srcID & 0xFFFF,
            };
            this.emit(tstype_1.GreenPowerEvents.deviceJoined, eventData);
        }
    }
    async permitJoin(time, networkAddress) {
        const payload = {
            options: time ? (networkAddress === null ? 0x0b : 0x2b) : 0x0a,
            commisioningWindow: time,
        };
        const frame = Zcl.ZclFrame.create(Zcl.FrameType.SPECIFIC, Zcl.Direction.SERVER_TO_CLIENT, true, null, zclTransactionSequenceNumber_1.default.next(), 'commisioningMode', 33, payload);
        if (networkAddress === null) {
            await this.adapter.sendZclFrameToAll(242, frame, 242);
        }
        else {
            await this.adapter.sendZclFrameToEndpoint(null, networkAddress, 242, frame, 10000, false, false, 242);
        }
    }
}
exports.default = GreenPower;
//# sourceMappingURL=greenPower.js.map