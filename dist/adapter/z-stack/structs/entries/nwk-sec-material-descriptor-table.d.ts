/// <reference types="node" />
import { Table } from "../table";
import { StructMemoryAlignment } from "../struct";
/**
 * Creates a network security material table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
export declare const nwkSecMaterialDescriptorTable: (dataOrCapacity?: Buffer | Buffer[] | number, alignment?: StructMemoryAlignment) => Pick<Table<Pick<import("../struct").Struct & Record<"FrameCounter", number> & Record<"extendedPanID", Buffer> & Record<"isSet", () => Boolean>, "serialize" | "getLength" | "toJSON" | "FrameCounter" | "extendedPanID" | "isSet">>, "indexOf" | "entries" | "serialize" | "capacity" | "used" | "free" | "freeCount" | "usedCount" | "getNextFree" | "inlineHeader">;
//# sourceMappingURL=nwk-sec-material-descriptor-table.d.ts.map