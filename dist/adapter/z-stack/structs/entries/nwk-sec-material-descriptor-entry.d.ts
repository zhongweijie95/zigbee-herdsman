/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Create a ZigBee Device Security Manager Security Material struct. This structure stores a frame counter
 * associated with a particular Extended PAN ID used by device. Used in NV in table format:
 * - `ZCD_NV_EX_NWK_SEC_MATERIAL_TABLE` - extended table (SimpleLink Z-Stack 3.x.0)
 * - `ZCD_NV_LEGACY_NWK_SEC_MATERIAL_TABLE_START` through `ZCD_NV_LEGACY_NWK_SEC_MATERIAL_TABLE_END` (Z-Stack 3.0.x)
 *
 * *Definition from Z-Stack 3.0.2 `ZDSecMgr.h`*
 *
 * @param data Data to initialize structure with.
 */
export declare const nwkSecMaterialDescriptorEntry: (data?: Buffer) => Pick<Struct & Record<"FrameCounter", number> & Record<"extendedPanID", Buffer> & Record<"isSet", () => Boolean>, "serialize" | "getLength" | "toJSON" | "FrameCounter" | "extendedPanID" | "isSet">;
//# sourceMappingURL=nwk-sec-material-descriptor-entry.d.ts.map