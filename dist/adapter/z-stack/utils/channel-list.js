"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareChannelLists = exports.packChannelList = exports.unpackChannelList = void 0;
/**
 * Converts packed `uint32` channel list to array of channel numbers.
 *
 * @param packedList Packed channel list value.
 */
const unpackChannelList = (packedList) => {
    return Array(26 - 11 + 1).fill(0).map((_, i) => 11 + i).filter(c => ((1 << c) & packedList) > 0);
};
exports.unpackChannelList = unpackChannelList;
/**
 * Converts array of channel numbers to packed `uint32` structure represented as number.
 * Supported channel range is 11 - 29.
 *
 * @param channelList List of channels to be packed.
 */
const packChannelList = (channelList) => {
    const invalidChannel = channelList.find(c => c < 11 || c > 26);
    /* istanbul ignore next */
    if (invalidChannel !== undefined) {
        throw new Error(`Cannot pack channel list - unsupported channel ${invalidChannel}`);
    }
    return channelList.reduce((a, c) => a + (1 << c), 0);
};
exports.packChannelList = packChannelList;
/**
 * Compares two channel lists. Either number arrays or packed `uint32` numbers may be provided.
 *
 * @param list1 First list to compare.
 * @param list2 Second list to compare.
 */
const compareChannelLists = (list1, list2) => {
    /* istanbul ignore next */
    list1 = Array.isArray(list1) ? exports.packChannelList(list1) : list1;
    list2 = Array.isArray(list2) ? exports.packChannelList(list2) : list2;
    return list1 === list2;
};
exports.compareChannelLists = compareChannelLists;
//# sourceMappingURL=channel-list.js.map