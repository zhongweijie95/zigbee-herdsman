/// <reference types="node" />
import { Table } from "../table";
import { StructMemoryAlignment } from "../struct";
/**
 * Creates an APS trust center link key data table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
export declare const apsTcLinkKeyTable: (dataOrCapacity?: Buffer | Buffer[] | number, alignment?: StructMemoryAlignment) => Pick<Table<Pick<import("../struct").Struct & Record<"txFrmCntr", number> & Record<"rxFrmCntr", number> & Record<"extAddr", Buffer> & Record<"keyAttributes", number> & Record<"keyType", number> & Record<"SeedShift_IcIndex", number>, "serialize" | "getLength" | "toJSON" | "txFrmCntr" | "rxFrmCntr" | "extAddr" | "keyAttributes" | "keyType" | "SeedShift_IcIndex">>, "indexOf" | "entries" | "serialize" | "capacity" | "used" | "free" | "freeCount" | "usedCount" | "getNextFree" | "inlineHeader">;
//# sourceMappingURL=aps-tc-link-key-table.d.ts.map