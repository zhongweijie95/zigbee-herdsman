/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Security manager authentication options.
 *
 * *Definition from Z-Stack 3.0.2 `ZDSecMgr.h.h`*
 */
export declare enum SecurityManagerAuthenticationOption {
    Default = 0,
    AuthenticatedCBCK = 1,
    AuthenticatedEA = 2
}
/**
 * Creates a security manager entry.
 *
 * *Definition from Z-Stack 3.0.2 `ZDSecMgr.c`*
 *
 * @param data Data to initialize structure with.
 */
export declare const securityManagerEntry: (data?: Buffer) => Pick<Struct & Record<"ami", number> & Record<"keyNvId", number> & Record<"authenticationOption", number>, "serialize" | "getLength" | "toJSON" | "ami" | "keyNvId" | "authenticationOption">;
//# sourceMappingURL=security-manager-entry.d.ts.map