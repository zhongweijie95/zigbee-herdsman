/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Creates a network PAN ID struct.
 *
 * @param data Data to initialize structure with.
 */
export declare const nwkPanId: (data?: Buffer) => Pick<Struct & Record<"panId", number>, "serialize" | "getLength" | "toJSON" | "panId">;
//# sourceMappingURL=nwk-pan-id.d.ts.map