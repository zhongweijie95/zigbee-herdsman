/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Creates a network key struct.
 *
 * @param data Data to initialize structure with.
 */
export declare const nwkKey: (data?: Buffer) => Pick<Struct & Record<"key", Buffer>, "key" | "serialize" | "getLength" | "toJSON">;
//# sourceMappingURL=nwk-key.d.ts.map