/// <reference types="node" />
import { Table } from "../table";
import { StructMemoryAlignment } from "../struct";
/**
 * Creates an APS link key data table.
 *
 * @param data Data to initialize table with.
 * @param alignment Memory alignment of initialization data.
 */
export declare const apsLinkKeyDataTable: (dataOrCapacity?: Buffer | Buffer[] | number, alignment?: StructMemoryAlignment) => Pick<Table<Pick<import("../struct").Struct & Record<"key", Buffer> & Record<"txFrmCntr", number> & Record<"rxFrmCntr", number>, "key" | "serialize" | "getLength" | "toJSON" | "txFrmCntr" | "rxFrmCntr">>, "indexOf" | "entries" | "serialize" | "capacity" | "used" | "free" | "freeCount" | "usedCount" | "getNextFree" | "inlineHeader">;
//# sourceMappingURL=aps-link-key-data-table.d.ts.map