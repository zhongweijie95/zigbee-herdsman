"use strict";
/* eslint max-len: 0 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dataType_1 = __importDefault(require("./dataType"));
const buffaloZclDataType_1 = __importDefault(require("./buffaloZclDataType"));
const status_1 = __importDefault(require("./status"));
const direction_1 = __importDefault(require("./direction"));
const Foundation = {
    read: {
        ID: 0,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
        ],
        response: 1,
    },
    readRsp: {
        ID: 1,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'status', type: dataType_1.default.uint8 },
            { name: 'dataType', type: dataType_1.default.uint8, conditions: [{ type: 'statusEquals', value: status_1.default.SUCCESS }] },
            { name: 'attrData', type: buffaloZclDataType_1.default.USE_DATA_TYPE, conditions: [{ type: 'statusEquals', value: status_1.default.SUCCESS }] },
        ],
    },
    write: {
        ID: 2,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8 },
            { name: 'attrData', type: buffaloZclDataType_1.default.USE_DATA_TYPE },
        ],
        response: 4,
    },
    writeUndiv: {
        ID: 3,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8 },
            { name: 'attrData', type: buffaloZclDataType_1.default.USE_DATA_TYPE },
        ],
    },
    writeRsp: {
        ID: 4,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'status', type: dataType_1.default.uint8 },
            { name: 'attrId', type: dataType_1.default.uint16, conditions: [{ type: 'statusNotEquals', value: status_1.default.SUCCESS }] },
        ],
    },
    writeNoRsp: {
        ID: 5,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8 },
            { name: 'attrData', type: buffaloZclDataType_1.default.USE_DATA_TYPE },
        ],
    },
    configReport: {
        ID: 6,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'direction', type: dataType_1.default.uint8 },
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'minRepIntval', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'maxRepIntval', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'repChange', type: buffaloZclDataType_1.default.USE_DATA_TYPE, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }, { type: 'dataTypeValueTypeEquals', value: 'ANALOG' }] },
            { name: 'timeout', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.SERVER_TO_CLIENT }] },
        ],
        response: 7,
    },
    configReportRsp: {
        ID: 7,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'status', type: dataType_1.default.uint8 },
            // minimumRemainingBufferBytes: if direction is present, attrId is also present
            // https://github.com/Koenkk/zigbee-herdsman/pull/115
            { name: 'direction', type: dataType_1.default.uint8, conditions: [{ type: 'minimumRemainingBufferBytes', value: 3 }] },
            { name: 'attrId', type: dataType_1.default.uint16, conditions: [{ type: 'minimumRemainingBufferBytes', value: 2 }] },
        ],
    },
    readReportConfig: {
        ID: 8,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'direction', type: dataType_1.default.uint8 },
            { name: 'attrId', type: dataType_1.default.uint16 },
        ],
    },
    readReportConfigRsp: {
        ID: 9,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'direction', type: dataType_1.default.uint8 },
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'minRepIntval', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'maxRepIntval', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }] },
            { name: 'repChange', type: buffaloZclDataType_1.default.USE_DATA_TYPE, conditions: [{ type: 'directionEquals', value: direction_1.default.CLIENT_TO_SERVER }, { type: 'dataTypeValueTypeEquals', value: 'ANALOG' }] },
            { name: 'timeout', type: dataType_1.default.uint16, conditions: [{ type: 'directionEquals', value: direction_1.default.SERVER_TO_CLIENT }] },
        ],
    },
    report: {
        ID: 10,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8 },
            { name: 'attrData', type: buffaloZclDataType_1.default.USE_DATA_TYPE },
        ],
    },
    defaultRsp: {
        ID: 11,
        parseStrategy: 'flat',
        parameters: [
            { name: 'cmdId', type: dataType_1.default.uint8 },
            { name: 'statusCode', type: dataType_1.default.uint8 },
        ],
    },
    discover: {
        ID: 12,
        parseStrategy: 'flat',
        parameters: [
            { name: 'startAttrId', type: dataType_1.default.uint16 },
            { name: 'maxAttrIds', type: dataType_1.default.uint8 },
        ],
    },
    discoverRsp: {
        ID: 13,
        parseStrategy: 'oneof',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'dataType', type: dataType_1.default.uint8 },
        ],
    },
    writeStructured: {
        ID: 15,
        parseStrategy: 'repetitive',
        parameters: [
            { name: 'attrId', type: dataType_1.default.uint16 },
            { name: 'selector', type: buffaloZclDataType_1.default.STRUCTURED_SELECTOR },
            { name: 'dataType', type: dataType_1.default.uint8 },
            { name: 'elementData', type: buffaloZclDataType_1.default.USE_DATA_TYPE },
        ]
    },
};
exports.default = Foundation;
//# sourceMappingURL=foundation.js.map