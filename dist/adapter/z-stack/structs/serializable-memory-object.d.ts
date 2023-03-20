/// <reference types="node" />
import { StructMemoryAlignment } from "./struct";
/**
 * Interface for serializable items to be written to NV. Objects implementing this interface
 * are structs and tables.
 */
export interface SerializableMemoryObject {
    serialize(alignment?: StructMemoryAlignment): Buffer;
}
/**
 * Signature for factory returning a memory struct or a table.
 */
export declare type MemoryObjectFactory<T> = (data?: Buffer | Buffer[]) => T;
//# sourceMappingURL=serializable-memory-object.d.ts.map