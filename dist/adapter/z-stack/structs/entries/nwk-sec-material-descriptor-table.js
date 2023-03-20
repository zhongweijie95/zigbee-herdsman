"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nwkSecMaterialDescriptorTable = void 0;
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const table_1 = require("../table");
const nwk_sec_material_descriptor_entry_1 = require("./nwk-sec-material-descriptor-entry");
/**
 * Creates a network security material table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
const nwkSecMaterialDescriptorTable = (dataOrCapacity, alignment = "unaligned") => {
    const table = table_1.Table.new()
        .struct(nwk_sec_material_descriptor_entry_1.nwkSecMaterialDescriptorEntry)
        .occupancy(e => e.isSet());
    return typeof dataOrCapacity === "number" ?
        table.build(dataOrCapacity) :
        table.build(dataOrCapacity, alignment);
};
exports.nwkSecMaterialDescriptorTable = nwkSecMaterialDescriptorTable;
//# sourceMappingURL=nwk-sec-material-descriptor-table.js.map