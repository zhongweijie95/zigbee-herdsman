/// <reference types="node" />
import { Table } from "../table";
import { StructMemoryAlignment } from "../struct";
/**
 * Creates a security manager inline table present within Z-Stack NV memory.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
export declare const securityManagerTable: (dataOrCapacity?: Buffer | Buffer[] | number, alignment?: StructMemoryAlignment) => Pick<Table<Pick<import("../struct").Struct & Record<"ami", number> & Record<"keyNvId", number> & Record<"authenticationOption", number>, "serialize" | "getLength" | "toJSON" | "ami" | "keyNvId" | "authenticationOption">>, "indexOf" | "entries" | "serialize" | "capacity" | "used" | "free" | "freeCount" | "usedCount" | "getNextFree" | "inlineHeader">;
//# sourceMappingURL=security-manager-table.d.ts.map