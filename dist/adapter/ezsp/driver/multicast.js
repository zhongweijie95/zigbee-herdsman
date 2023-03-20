"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Multicast = void 0;
const types_1 = require("./types");
const named_1 = require("./types/named");
const struct_1 = require("./types/struct");
const debug_1 = __importDefault(require("debug"));
const debug = {
    log: debug_1.default('zigbee-herdsman:adapter:ezsp:multicast'),
};
class Multicast {
    constructor(driver) {
        this.TABLE_SIZE = 16;
        this.driver = driver;
        this._multicast = {};
        this._available = [];
    }
    async _initialize() {
        const size = await this.driver.ezsp.getConfigurationValue(types_1.EzspConfigId.CONFIG_MULTICAST_TABLE_SIZE);
        for (let i = 0; i < size; i++) {
            const entry = await this.driver.ezsp.getMulticastTableEntry(i);
            debug.log("MulticastTableEntry[%s] = %s", i, entry);
            if (entry.endpoint !== 0) {
                this._multicast[entry.multicastId] = [entry, i];
            }
            else {
                this._available.push(i);
            }
        }
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    async startup(enpoints) {
        return this.driver.queue.execute(async () => {
            await this._initialize();
            for (const ep of enpoints) {
                if (!ep.id)
                    continue;
                for (const group_id of ep.member_of) {
                    await this.subscribe(group_id, ep.id);
                }
            }
        });
    }
    async subscribe(group_id, endpoint) {
        if (this._multicast.hasOwnProperty(group_id)) {
            debug.log("%s is already subscribed", group_id);
            return named_1.EmberStatus.SUCCESS;
        }
        try {
            const idx = this._available.pop();
            const entry = new struct_1.EmberMulticastTableEntry();
            entry.endpoint = endpoint;
            entry.multicastId = group_id;
            entry.networkIndex = 0;
            const [status] = await this.driver.ezsp.setMulticastTableEntry(idx, entry);
            if (status !== named_1.EmberStatus.SUCCESS) {
                debug.log("Set MulticastTableEntry #%s for %s multicast id: %s", idx, entry.multicastId, status);
                this._available.push(idx);
                return status;
            }
            this._multicast[entry.multicastId] = [entry, idx];
            debug.log("Set MulticastTableEntry #%s for %s multicast id: %s", idx, entry.multicastId, status);
            return status;
        }
        catch (e) {
            debug.log("No more available slots MulticastId subscription");
            return named_1.EmberStatus.INDEX_OUT_OF_RANGE;
        }
    }
}
exports.Multicast = Multicast;
//# sourceMappingURL=multicast.js.map