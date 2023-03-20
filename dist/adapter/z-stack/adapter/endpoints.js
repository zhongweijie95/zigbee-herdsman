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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Endpoints = void 0;
const Constants = __importStar(require("../constants"));
const Zcl = __importStar(require("../../../zcl"));
const EndpointDefaults = {
    appdeviceid: 0x0005,
    appdevver: 0,
    appnuminclusters: 0,
    appinclusterlist: [],
    appnumoutclusters: 0,
    appoutclusterlist: [],
    latencyreq: Constants.AF.networkLatencyReq.NO_LATENCY_REQS,
};
exports.Endpoints = [
    { ...EndpointDefaults, endpoint: 1, appprofid: 0x0104 },
    { ...EndpointDefaults, endpoint: 2, appprofid: 0x0101 },
    // Required for https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0fb06c2429171f327950484ea3dec80864637cc
    { ...EndpointDefaults, endpoint: 3, appprofid: 0x0104 },
    { ...EndpointDefaults, endpoint: 4, appprofid: 0x0107 },
    { ...EndpointDefaults, endpoint: 5, appprofid: 0x0108 },
    { ...EndpointDefaults, endpoint: 6, appprofid: 0x0109 },
    { ...EndpointDefaults, endpoint: 8, appprofid: 0x0104 },
    { ...EndpointDefaults, endpoint: 10, appprofid: 0x0104 },
    {
        ...EndpointDefaults,
        endpoint: 11,
        appprofid: 0x0104,
        appdeviceid: 0x0400,
        appnumoutclusters: 2,
        appoutclusterlist: [Zcl.Utils.getCluster('ssIasZone').ID, Zcl.Utils.getCluster('ssIasWd').ID],
        appnuminclusters: 2,
        // genTime required for https://github.com/Koenkk/zigbee2mqtt/issues/10816
        appinclusterlist: [Zcl.Utils.getCluster('ssIasAce').ID, Zcl.Utils.getCluster('genTime').ID]
    },
    // TERNCY: https://github.com/Koenkk/zigbee-herdsman/issues/82
    { ...EndpointDefaults, endpoint: 0x6E, appprofid: 0x0104 },
    { ...EndpointDefaults, endpoint: 12, appprofid: 0xc05e },
    {
        ...EndpointDefaults,
        endpoint: 13,
        appprofid: 0x0104,
        appnuminclusters: 1,
        appinclusterlist: [Zcl.Utils.getCluster('genOta').ID]
    },
    // Insta/Jung/Gira: OTA fallback EP (since it's buggy in firmware 10023202 when it tries to find a matching EP for
    // OTA - it queries for ZLL profile, but then contacts with HA profile)
    { ...EndpointDefaults, endpoint: 47, appprofid: 0x0104 },
    { ...EndpointDefaults, endpoint: 242, appprofid: 0xa1e0 },
];
//# sourceMappingURL=endpoints.js.map