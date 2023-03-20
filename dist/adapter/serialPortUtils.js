"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serialport_1 = __importDefault(require("serialport"));
const utils_1 = require("../utils");
async function find(matchers) {
    let devices = await serialport_1.default.list();
    devices = devices.filter((device) => matchers.find((matcher) => utils_1.EqualsPartial(device, matcher)) != null);
    return devices.map((device) => device.path);
}
async function is(path, matchers) {
    const devices = await serialport_1.default.list();
    const device = devices.find((device) => device.path === path);
    if (!device) {
        return false;
    }
    return matchers.find((matcher) => utils_1.EqualsPartial(device, matcher)) != null;
}
exports.default = { is, find };
//# sourceMappingURL=serialPortUtils.js.map