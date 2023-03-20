"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apsLinkKeyDataTable = void 0;
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const table_1 = require("../table");
const aps_link_key_data_entry_1 = require("./aps-link-key-data-entry");
const emptyKey = Buffer.alloc(16, 0x00);
/**
 * Creates an APS link key data table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
const apsLinkKeyDataTable = (dataOrCapacity, alignment = "unaligned") => {
    const table = table_1.Table.new()
        .struct(aps_link_key_data_entry_1.apsLinkKeyDataEntry)
        .occupancy(e => !e.key.equals(emptyKey));
    return typeof dataOrCapacity === "number" ?
        table.build(dataOrCapacity) :
        table.build(dataOrCapacity, alignment);
};
exports.apsLinkKeyDataTable = apsLinkKeyDataTable;
//# sourceMappingURL=aps-link-key-data-table.js.map