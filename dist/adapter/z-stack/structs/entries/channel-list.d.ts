/// <reference types="node" />
import { Struct } from "../struct";
/**
 * Creates a channel list struct.
 *
 * @param data Data to initialize structure with.
 */
export declare const channelList: (data?: Buffer) => Pick<Struct & Record<"channelList", number>, "serialize" | "getLength" | "toJSON" | "channelList">;
//# sourceMappingURL=channel-list.d.ts.map