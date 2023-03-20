"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apsTcLinkKeyTable = void 0;
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const table_1 = require("../table");
const aps_tc_link_key_entry_1 = require("./aps-tc-link-key-entry");
const emptyAddress = Buffer.alloc(8, 0x00);
/**
 * Creates an APS trust center link key data table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
const apsTcLinkKeyTable = (dataOrCapacity, alignment = "unaligned") => {
    const table = table_1.Table.new()
        .struct(aps_tc_link_key_entry_1.apsTcLinkKeyEntry)
        .occupancy(e => !e.extAddr.equals(emptyAddress));
    return typeof dataOrCapacity === "number" ?
        table.build(dataOrCapacity) :
        table.build(dataOrCapacity, alignment);
};
exports.apsTcLinkKeyTable = apsTcLinkKeyTable;
//# sourceMappingURL=aps-tc-link-key-table.js.map