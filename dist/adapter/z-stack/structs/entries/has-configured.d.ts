/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Creates a zigbee-herdsman `hasConfigured` struct.
 *
 * @param data Data to initialize structure with.
 */
export declare const hasConfigured: (data?: Buffer) => Pick<Struct & Record<"hasConfigured", number> & Record<"isConfigured", () => Boolean>, "serialize" | "getLength" | "toJSON" | "hasConfigured" | "isConfigured">;
//# sourceMappingURL=has-configured.d.ts.map