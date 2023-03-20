"use strict";
/* eslint-disable max-len */
/* istanbul ignore file */
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareNetworkOptions = void 0;
const channel_list_1 = require("./channel-list");
/**
 * Checks if two network options models match.
 *
 * @param opts1 First network options struct to check.
 * @param opts2 Second network options struct to check.
 */
const compareNetworkOptions = (opts1, opts2, lenientExtendedPanIdMatching) => {
    return (opts1.panId === opts2.panId &&
        (opts1.extendedPanId.equals(opts2.extendedPanId) ||
            (lenientExtendedPanIdMatching && (opts1.hasDefaultExtendedPanId || opts2.hasDefaultExtendedPanId)) ||
            (lenientExtendedPanIdMatching && (opts1.extendedPanId.equals(Buffer.from(opts2.extendedPanId).reverse())))) &&
        opts1.networkKey.equals(opts2.networkKey) &&
        channel_list_1.compareChannelLists(opts1.channelList, opts2.channelList) &&
        opts1.networkKeyDistribute === opts2.networkKeyDistribute);
};
exports.compareNetworkOptions = compareNetworkOptions;
//# sourceMappingURL=network-options.js.map