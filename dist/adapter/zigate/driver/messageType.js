"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZiGateMessage = void 0;
/* istanbul ignore file */
/* eslint-disable */
const constants_1 = require("./constants");
exports.ZiGateMessage = {
    [constants_1.ZiGateMessageCode.GetTimeServer]: {
        response: [
            { name: 'timestampUTC', parameterType: 'UINT32' },
        ]
    },
    [constants_1.ZiGateMessageCode.DeviceAnnounce]: {
        response: [
            { name: 'shortAddress', parameterType: 'UINT16BE' },
            { name: 'ieee', parameterType: 'IEEEADDR' },
            { name: 'MACcapability', parameterType: 'MACCAPABILITY' },
        ]
    },
    [constants_1.ZiGateMessageCode.Status]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            // 0 = Success
            // 1 = Incorrect parameters
            // 2 = Unhandled command
            // 3 = Command failed
            // eslint-disable-next-line max-len
            // 4 = Busy (Node is carrying out a lengthy operation and is currently unable to handle the incoming command)
            // 5 = Stack already started (no new configuration accepted)
            // 128 – 244 = Failed (ZigBee event codes)
            // Packet Type: The value of the initiating command request.
            { name: 'sequence', parameterType: 'UINT8' },
            { name: 'packetType', parameterType: 'UINT16BE' },
        ]
    },
    [constants_1.ZiGateMessageCode.PermitJoinStatus]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.DataIndication]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            { name: 'profileID', parameterType: 'UINT16BE' },
            { name: 'clusterID', parameterType: 'UINT16BE' },
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'destinationEndpoint', parameterType: 'UINT8' },
            { name: 'sourceAddressMode', parameterType: 'UINT8' },
            { name: 'sourceAddress', parameterType: 'ADDRESS_WITH_TYPE_DEPENDENCY' },
            // <source address: uint16_t or uint64_t>
            { name: 'destinationAddressMode', parameterType: 'UINT8' },
            // <destination address mode: uint8_t>
            { name: 'destinationAddress', parameterType: 'ADDRESS_WITH_TYPE_DEPENDENCY' },
            // <destination address: uint16_t or uint64_t>
            // {name: 'payloadSize', parameterType:'UINT8'}, // <payload size : uint8_t>
            { name: 'payload', parameterType: 'BUFFER_RAW' },
        ]
    },
    [constants_1.ZiGateMessageCode.NodeClusterList]: {
        response: [
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'profileID', parameterType: 'UINT16' },
            { name: 'clusterCount', parameterType: 'UINT8' },
            { name: 'clusterList', parameterType: 'LIST_UINT16' },
        ]
    },
    [constants_1.ZiGateMessageCode.NodeAttributeList]: {
        response: [
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'profileID', parameterType: 'UINT16' },
            { name: 'clusterID', parameterType: 'UINT16' },
            { name: 'attributeCount', parameterType: 'UINT8' },
            { name: 'attributeList', parameterType: 'LIST_UINT16' },
        ]
    },
    [constants_1.ZiGateMessageCode.NodeCommandIDList]: {
        response: [
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'profileID', parameterType: 'UINT16' },
            { name: 'clusterID', parameterType: 'UINT16' },
            { name: 'commandIDCount', parameterType: 'UINT8' },
            { name: 'commandIDList', parameterType: 'LIST_UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.APSDataACK]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            // {name: 'sourceEndpoint', parameterType:'UINT8'}, // <source endpoint: uint8_t>
            // {name: 'destinationAddressMode', parameterType:'UINT8'},
            // // <destination address mode: uint8_t>
            { name: 'destinationAddress', parameterType: 'UINT16BE' },
            { name: 'destinationEndpoint', parameterType: 'UINT8' },
            { name: 'clusterID', parameterType: 'UINT16BE' },
            // // <destination address: uint16_t or uint64_t>
            { name: 'seqNumber', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.APSDataConfirm]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'destinationAddressMode', parameterType: 'UINT8' },
            { name: 'destinationAddressMode', parameterType: 'UINT8' },
            // <destination address mode: uint8_t>
            { name: 'destinationAddress', parameterType: 'ADDRESS_WITH_TYPE_DEPENDENCY' },
            // <destination address: uint16_t or uint64_t>
            { name: 'seqNumber', parameterType: 'UINT8' },
            // from 3.1e
            { name: 'PDUM_u8GetNpduUse', parameterType: 'MAYBE_UINT8' },
            { name: 'u8GetApduUse', parameterType: 'MAYBE_UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.APSDataConfirmFailed]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'destinationEndpoint', parameterType: 'UINT8' },
            { name: 'destinationAddressMode', parameterType: 'UINT8' },
            { name: 'destinationAddress', parameterType: 'ADDRESS_WITH_TYPE_DEPENDENCY' },
            // <destination address: uint64_t>
            { name: 'seqNumber', parameterType: 'UINT8' },
            // from 3.1e
            { name: 'PDUM_u8GetNpduUse', parameterType: 'MAYBE_UINT8' },
            { name: 'u8GetApduUse', parameterType: 'MAYBE_UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.NetworkState]: {
        response: [
            { name: 'shortAddress', parameterType: 'UINT16BE' },
            { name: 'extendedAddress', parameterType: 'IEEEADDR' },
            { name: 'PANID', parameterType: 'UINT16BE' },
            { name: 'ExtPANID', parameterType: 'IEEEADDR' },
            { name: 'Channel', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.VersionList]: {
        response: [
            { name: 'major', parameterType: 'UINT8' },
            { name: 'minor', parameterType: 'UINT8' },
            { name: 'revision', parameterType: 'UINT16' },
        ]
    },
    [constants_1.ZiGateMessageCode.NetworkJoined]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
            // Status:
            // 0 = Joined existing network
            // 1 = Formed new network
            // 128 – 244 = Failed (ZigBee event codes)
            { name: 'shortAddress', parameterType: 'UINT16BE' },
        ]
    },
    [constants_1.ZiGateMessageCode.LeaveIndication]: {
        response: [
            { name: 'extendedAddress', parameterType: 'IEEEADDR' },
            { name: 'rejoin', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.ManagementLeaveResponse]: {
        response: [
            { name: 'sqn', parameterType: 'UINT8' },
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.RouterDiscoveryConfirm]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.SimpleDescriptorResponse]: {
        response: [
            { name: 'sourceEndpoint', parameterType: 'UINT8' },
            { name: 'profile ID', parameterType: 'UINT16BE' },
            { name: 'clusterID', parameterType: 'UINT16BE' },
            { name: 'attributeList', parameterType: 'LIST_UINT16BE' },
        ]
    },
    [constants_1.ZiGateMessageCode.ManagementLQIResponse]: {
        response: [
            { name: 'sequence', parameterType: 'UINT8' },
            { name: 'status', parameterType: 'UINT8' },
            { name: 'neighbourTableEntries', parameterType: 'UINT8' },
            { name: 'neighbourTableListCount', parameterType: 'UINT8' },
            { name: 'startIndex', parameterType: 'UINT8' },
            // @TODO list TYPE
            // <List of Entries elements described below :>
            // Note: If Neighbour Table list count is 0, there are no elements in the list.
            { name: 'NWKAddress', parameterType: 'UINT16BE' },
            { name: 'Extended PAN ID', parameterType: 'UINT64' },
            { name: 'IEEE Address', parameterType: 'IEEEADR' },
            { name: 'Depth', parameterType: 'UINT8' },
            { name: 'linkQuality', parameterType: 'UINT8' },
            { name: 'bitMap', parameterType: 'UINT8' },
            // bit 0-1 Device Type
            // (0-Coordinator 1-Router 2-End Device)
            // bit 2-3 Permit Join status
            // (1- On 0-Off)
            // bit 4-5 Relationship
            // (0-Parent 1-Child 2-Sibling)
            // bit 6-7 Rx On When Idle status
            // (1-On 0-Off)
            { name: 'srcAddress', parameterType: 'UINT16BE' },
        ]
    },
    [constants_1.ZiGateMessageCode.PDMEvent]: {
        response: [
            { name: 'eventStatus', parameterType: 'UINT8' },
            { name: 'recordID', parameterType: 'UINT32BE' },
        ]
    },
    [constants_1.ZiGateMessageCode.PDMLoaded]: {
        response: [
            { name: 'length', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.RestartNonFactoryNew]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.RestartFactoryNew]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [constants_1.ZiGateMessageCode.ExtendedStatusCallBack]: {
        response: [
            { name: 'status', parameterType: 'UINT8' },
        ]
    },
    [0x8001]: {
        response: [
            { name: 'logLevel', parameterType: 'LOG_LEVEL' },
            { name: 'log', parameterType: 'STRING' },
        ]
    },
    [constants_1.ZiGateMessageCode.AddGroupResponse]: {
        response: [
            { name: 'status', parameterType: 'UINT16BE' },
            { name: 'groupAddress', parameterType: 'UINT16BE' },
        ]
    }
};
//# sourceMappingURL=messageType.js.map