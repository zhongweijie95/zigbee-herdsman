/// <reference types="node" />
import { Table } from "../table";
import { StructMemoryAlignment } from "../struct";
/**
 * Creates an address manager inline table present within Z-Stack NV memory.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
export declare const addressManagerTable: (dataOrCapacity?: Buffer | Buffer[] | number, alignment?: StructMemoryAlignment) => Pick<Table<Pick<import("../struct").Struct & Record<"user", number> & Record<"nwkAddr", number> & Record<"extAddr", Buffer> & Record<"isSet", () => Boolean>, "serialize" | "getLength" | "toJSON" | "isSet" | "extAddr" | "user" | "nwkAddr">>, "indexOf" | "entries" | "serialize" | "capacity" | "used" | "free" | "freeCount" | "usedCount" | "getNextFree" | "inlineHeader">;
//# sourceMappingURL=address-manager-table.d.ts.map