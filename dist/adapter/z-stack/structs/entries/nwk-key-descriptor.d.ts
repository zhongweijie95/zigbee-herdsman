/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Creates a Security Service Provider (SSP) Network Descriptor struct.
 *
 * *Definition from Z-Stack 3.0.2 `ssp.h`*
 *
 * @param data Data to initialize structure with.
 */
export declare const nwkKeyDescriptor: (data?: Buffer) => Pick<Struct & Record<"keySeqNum", number> & Record<"key", Buffer>, "key" | "serialize" | "getLength" | "toJSON" | "keySeqNum">;
//# sourceMappingURL=nwk-key-descriptor.d.ts.map