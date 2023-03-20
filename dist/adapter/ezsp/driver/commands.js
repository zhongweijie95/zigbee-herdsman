"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZDO_COMMANDS = exports.COMMANDS = void 0;
/* istanbul ignore file */
const types_1 = require("./types");
/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
exports.COMMANDS = {
    "version": [0, [types_1.uint8_t],
        [types_1.uint8_t, types_1.uint8_t, types_1.uint16_t]
    ],
    "getConfigurationValue": [82, [types_1.EzspConfigId],
        [types_1.EzspStatus, types_1.uint16_t]
    ],
    "setConfigurationValue": [83, [types_1.EzspConfigId, types_1.uint16_t],
        [types_1.EzspStatus]
    ],
    "addEndpoint": [0x0002, [
            types_1.uint8_t,
            types_1.uint16_t,
            types_1.uint16_t,
            types_1.uint8_t,
            types_1.uint8_t,
            types_1.uint8_t,
            types_1.WordList,
            types_1.WordList,
        ],
        [types_1.EzspStatus],
    ],
    "setPolicy": [85, [types_1.EzspPolicyId, types_1.EzspDecisionId],
        [types_1.EzspStatus]
    ],
    "getPolicy": [86, [types_1.EzspPolicyId],
        [types_1.EzspStatus, types_1.EzspDecisionId]
    ],
    "getValue": [170, [types_1.EzspValueId],
        [types_1.EzspStatus, types_1.LVBytes]
    ],
    "getExtendedValue": [3, [types_1.EzspExtendedValueId, types_1.uint32_t],
        [types_1.EzspStatus, types_1.LVBytes]
    ],
    "setValue": [171, [types_1.EzspValueId, types_1.LVBytes],
        [types_1.EzspStatus]
    ],
    "setGpioCurrentConfiguration": [172, [types_1.uint8_t, types_1.uint8_t, types_1.uint8_t],
        [types_1.EzspStatus]
    ],
    "setGpioPowerUpDownConfiguration": [173, [types_1.uint8_t, types_1.uint8_t, types_1.uint8_t, types_1.uint8_t, types_1.uint8_t],
        [types_1.EzspStatus]
    ],
    "setGpioRadioPowerMask": [174, [types_1.uint32_t],
        []
    ],
    "setCtune": [245, [types_1.uint16_t],
        []
    ],
    "getCtune": [246, [],
        [types_1.uint16_t]
    ],
    "setChannelMap": [247, [types_1.uint8_t, types_1.uint8_t],
        []
    ],
    "nop": [5, [],
        []
    ],
    "echo": [129, [types_1.LVBytes],
        [types_1.LVBytes]
    ],
    "invalidCommand": [88, [],
        [types_1.EzspStatus]
    ],
    "callback": [6, [],
        []
    ],
    "noCallbacks": [7, [],
        []
    ],
    "setToken": [9, [types_1.uint8_t, types_1.fixed_list(8, types_1.uint8_t)],
        [types_1.EmberStatus]
    ],
    "getToken": [10, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.fixed_list(8, types_1.uint8_t)]
    ],
    "getMfgToken": [11, [types_1.EzspMfgTokenId],
        [types_1.LVBytes]
    ],
    "setMfgToken": [12, [types_1.EzspMfgTokenId, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "stackTokenChangedHandler": [13, [],
        [types_1.uint16_t]
    ],
    "getRandomNumber": [73, [],
        [types_1.EmberStatus, types_1.uint16_t]
    ],
    "setTimer": [14, [types_1.uint8_t, types_1.uint16_t, types_1.EmberEventUnits, types_1.Bool],
        [types_1.EmberStatus]
    ],
    "getTimer": [78, [types_1.uint8_t],
        [types_1.uint16_t, types_1.EmberEventUnits, types_1.Bool]
    ],
    "timerHandler": [15, [],
        [types_1.uint8_t]
    ],
    "debugWrite": [18, [types_1.Bool, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "readAndClearCounters": [101, [],
        [types_1.fixed_list(types_1.EmberCounterType.COUNTER_TYPE_COUNT, types_1.uint16_t)]
    ],
    "readCounters": [241, [],
        [types_1.fixed_list(types_1.EmberCounterType.COUNTER_TYPE_COUNT, types_1.uint16_t)]
    ],
    "counterRolloverHandler": [242, [],
        [types_1.EmberCounterType]
    ],
    "delayTest": [157, [types_1.uint16_t],
        []
    ],
    "getLibraryStatus": [1, [types_1.uint8_t],
        [types_1.EmberLibraryStatus]
    ],
    "getXncpInfo": [19, [],
        [types_1.EmberStatus, types_1.uint16_t, types_1.uint16_t]
    ],
    "customFrame": [71, [types_1.LVBytes],
        [types_1.EmberStatus, types_1.LVBytes]
    ],
    "customFrameHandler": [84, [],
        [types_1.LVBytes]
    ],
    "getEui64": [38, [],
        [types_1.EmberEUI64]
    ],
    "getNodeId": [39, [],
        [types_1.EmberNodeId]
    ],
    "networkInit": [23, [],
        [types_1.EmberStatus]
    ],
    "setManufacturerCode": [21, [types_1.uint16_t],
        []
    ],
    "setPowerDescriptor": [22, [types_1.uint16_t],
        []
    ],
    "networkInitExtended": [112, [types_1.EmberNetworkInitStruct],
        [types_1.EmberStatus]
    ],
    "networkState": [24, [],
        [types_1.EmberNetworkStatus]
    ],
    "stackStatusHandler": [25, [],
        [types_1.EmberStatus]
    ],
    "startScan": [26, [types_1.EzspNetworkScanType, types_1.uint32_t, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "energyScanResultHandler": [72, [],
        [types_1.uint8_t, types_1.int8s]
    ],
    "networkFoundHandler": [27, [],
        [types_1.EmberZigbeeNetwork, types_1.uint8_t, types_1.int8s]
    ],
    "scanCompleteHandler": [28, [],
        [types_1.uint8_t, types_1.EmberStatus]
    ],
    "stopScan": [29, [],
        [types_1.EmberStatus]
    ],
    "formNetwork": [30, [types_1.EmberNetworkParameters],
        [types_1.EmberStatus]
    ],
    "joinNetwork": [31, [types_1.EmberNodeType, types_1.EmberNetworkParameters],
        [types_1.EmberStatus]
    ],
    "leaveNetwork": [32, [],
        [types_1.EmberStatus]
    ],
    "findAndRejoinNetwork": [33, [types_1.Bool, types_1.uint32_t],
        [types_1.EmberStatus]
    ],
    "permitJoining": [34, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "childJoinHandler": [35, [],
        [types_1.uint8_t, types_1.Bool, types_1.EmberNodeId, types_1.EmberEUI64, types_1.EmberNodeType]
    ],
    "energyScanRequest": [156, [types_1.EmberNodeId, types_1.uint32_t, types_1.uint8_t, types_1.uint16_t],
        [types_1.EmberStatus]
    ],
    "getNetworkParameters": [40, [],
        [types_1.EmberStatus, types_1.EmberNodeType, types_1.EmberNetworkParameters]
    ],
    "getParentChildParameters": [41, [],
        [types_1.uint8_t, types_1.EmberEUI64, types_1.EmberNodeId]
    ],
    "getChildData": [74, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberNodeId, types_1.EmberEUI64, types_1.EmberNodeType]
    ],
    "getNeighbor": [121, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberNeighborTableEntry]
    ],
    "neighborCount": [122, [],
        [types_1.uint8_t]
    ],
    "getRouteTableEntry": [123, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberRouteTableEntry]
    ],
    "setRadioPower": [153, [types_1.int8s],
        [types_1.EmberStatus]
    ],
    "setRadioChannel": [154, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "setConcentrator": [16, [types_1.Bool, types_1.uint16_t, types_1.uint16_t, types_1.uint16_t, types_1.uint8_t, types_1.uint8_t, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "clearBindingTable": [42, [],
        [types_1.EmberStatus]
    ],
    "setBinding": [43, [types_1.uint8_t, types_1.EmberBindingTableEntry],
        [types_1.EmberStatus]
    ],
    "getBinding": [44, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberBindingTableEntry]
    ],
    "deleteBinding": [45, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "bindingIsActive": [46, [types_1.uint8_t],
        [types_1.Bool]
    ],
    "getBindingRemoteNodeId": [47, [types_1.uint8_t],
        [types_1.EmberNodeId]
    ],
    "setBindingRemoteNodeId": [48, [types_1.uint8_t],
        []
    ],
    "remoteSetBindingHandler": [49, [],
        [types_1.EmberBindingTableEntry]
    ],
    "remoteDeleteBindingHandler": [50, [],
        [types_1.uint8_t, types_1.EmberStatus]
    ],
    "maximumPayloadLength": [51, [],
        [types_1.uint8_t]
    ],
    "sendUnicast": [52, [types_1.EmberOutgoingMessageType, types_1.EmberNodeId, types_1.EmberApsFrame, types_1.uint8_t, types_1.LVBytes],
        [types_1.EmberStatus, types_1.uint8_t]
    ],
    "sendBroadcast": [54, [types_1.EmberNodeId, types_1.EmberApsFrame, types_1.uint8_t, types_1.uint8_t, types_1.LVBytes],
        [types_1.EmberStatus, types_1.uint8_t]
    ],
    "proxyBroadcast": [55, [types_1.EmberNodeId, types_1.EmberNodeId, types_1.uint8_t, types_1.EmberApsFrame, types_1.uint8_t, types_1.uint8_t, types_1.LVBytes],
        [types_1.EmberStatus, types_1.uint8_t]
    ],
    "sendMulticast": [56, [types_1.EmberApsFrame, types_1.uint8_t, types_1.uint8_t, types_1.uint8_t, types_1.LVBytes],
        [types_1.EmberStatus, types_1.uint8_t]
    ],
    "sendReply": [57, [types_1.EmberNodeId, types_1.EmberApsFrame, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "messageSentHandler": [63, [],
        [types_1.EmberOutgoingMessageType, types_1.uint16_t, types_1.EmberApsFrame, types_1.uint8_t, types_1.EmberStatus, types_1.LVBytes]
    ],
    "sendManyToOneRouteRequest": [65, [types_1.uint16_t, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "pollForData": [66, [types_1.uint16_t, types_1.EmberEventUnits, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "pollCompleteHandler": [67, [],
        [types_1.EmberStatus]
    ],
    "pollHandler": [68, [],
        [types_1.EmberNodeId]
    ],
    "incomingSenderEui64Handler": [98, [],
        [types_1.EmberEUI64]
    ],
    "incomingMessageHandler": [69, [],
        [types_1.EmberIncomingMessageType, types_1.EmberApsFrame, types_1.uint8_t, types_1.int8s, types_1.EmberNodeId, types_1.uint8_t, types_1.uint8_t, types_1.LVBytes]
    ],
    "incomingRouteRecordHandler": [89, [],
        [types_1.EmberNodeId, types_1.EmberEUI64, types_1.uint8_t, types_1.int8s, types_1.LVBytes]
    ],
    "incomingManyToOneRouteRequestHandler": [125, [],
        [types_1.EmberNodeId, types_1.EmberEUI64, types_1.uint8_t]
    ],
    "incomingRouteErrorHandler": [128, [],
        [types_1.EmberStatus, types_1.EmberNodeId]
    ],
    "addressTableEntryIsActive": [91, [types_1.uint8_t],
        [types_1.Bool]
    ],
    "setAddressTableRemoteEui64": [92, [types_1.uint8_t, types_1.EmberEUI64],
        [types_1.EmberStatus]
    ],
    "setAddressTableRemoteNodeId": [93, [types_1.uint8_t, types_1.EmberNodeId],
        []
    ],
    "getAddressTableRemoteEui64": [94, [types_1.uint8_t],
        [types_1.EmberEUI64]
    ],
    "getAddressTableRemoteNodeId": [95, [types_1.uint8_t],
        [types_1.EmberNodeId]
    ],
    "setExtendedTimeout": [126, [types_1.EmberEUI64, types_1.Bool],
        []
    ],
    "getExtendedTimeout": [127, [types_1.EmberEUI64],
        [types_1.Bool]
    ],
    "replaceAddressTableEntry": [130, [types_1.uint8_t, types_1.EmberEUI64, types_1.EmberNodeId, types_1.Bool],
        [types_1.EmberStatus, types_1.EmberEUI64, types_1.EmberNodeId, types_1.Bool]
    ],
    "lookupNodeIdByEui64": [96, [types_1.EmberEUI64],
        [types_1.EmberNodeId]
    ],
    "lookupEui64ByNodeId": [97, [types_1.EmberNodeId],
        [types_1.EmberStatus, types_1.EmberEUI64]
    ],
    "getMulticastTableEntry": [99, [types_1.uint8_t],
        [types_1.EmberMulticastTableEntry]
    ],
    "setMulticastTableEntry": [100, [types_1.uint8_t, types_1.EmberMulticastTableEntry],
        [types_1.EmberStatus]
    ],
    "idConflictHandler": [124, [],
        [types_1.EmberNodeId]
    ],
    "sendRawMessage": [150, [types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "macPassthroughMessageHandler": [151, [],
        [types_1.EmberMacPassthroughType, types_1.uint8_t, types_1.int8s, types_1.LVBytes]
    ],
    "macFilterMatchMessageHandler": [70, [],
        [types_1.uint8_t, types_1.EmberMacPassthroughType, types_1.uint8_t, types_1.int8s, types_1.LVBytes]
    ],
    "rawTransmitCompleteHandler": [152, [],
        [types_1.EmberStatus]
    ],
    "setInitialSecurityState": [104, [types_1.EmberInitialSecurityState],
        [types_1.EmberStatus]
    ],
    "getCurrentSecurityState": [105, [],
        [types_1.EmberStatus, types_1.EmberCurrentSecurityState]
    ],
    "getKey": [106, [types_1.EmberKeyType],
        [types_1.EmberStatus, types_1.EmberKeyStruct]
    ],
    "switchNetworkKeyHandler": [110, [],
        [types_1.uint8_t]
    ],
    "getKeyTableEntry": [113, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberKeyStruct]
    ],
    "setKeyTableEntry": [114, [types_1.uint8_t, types_1.EmberEUI64, types_1.Bool, types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "findKeyTableEntry": [117, [types_1.EmberEUI64, types_1.Bool],
        [types_1.uint8_t]
    ],
    "addOrUpdateKeyTableEntry": [102, [types_1.EmberEUI64, types_1.Bool, types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "eraseKeyTableEntry": [118, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "clearKeyTable": [177, [],
        [types_1.EmberStatus]
    ],
    "requestLinkKey": [20, [types_1.EmberEUI64],
        [types_1.EmberStatus]
    ],
    "zigbeeKeyEstablishmentHandler": [155, [],
        [types_1.EmberEUI64, types_1.EmberKeyStatus]
    ],
    "addTransientLinkKey": [175, [types_1.EmberEUI64, types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "clearTransientLinkKeys": [107, [],
        []
    ],
    "setSecurityKey": [202, [types_1.EmberKeyData, types_1.SecureEzspSecurityType],
        [types_1.EzspStatus]
    ],
    "setSecurityParameters": [203, [types_1.SecureEzspSecurityLevel, types_1.SecureEzspRandomNumber],
        [types_1.EzspStatus, types_1.SecureEzspRandomNumber]
    ],
    "resetToFactoryDefaults": [204, [],
        [types_1.EzspStatus]
    ],
    "getSecurityKeyStatus": [205, [],
        [types_1.EzspStatus, types_1.SecureEzspSecurityType]
    ],
    "trustCenterJoinHandler": [36, [],
        [types_1.EmberNodeId, types_1.EmberEUI64, types_1.EmberDeviceUpdate, types_1.EmberJoinDecision, types_1.EmberNodeId]
    ],
    "broadcastNextNetworkKey": [115, [types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "broadcastNetworkKeySwitch": [116, [],
        [types_1.EmberStatus]
    ],
    "becomeTrustCenter": [119, [types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "aesMmoHash": [111, [types_1.EmberAesMmoHashContext, types_1.Bool, types_1.LVBytes],
        [types_1.EmberStatus, types_1.EmberAesMmoHashContext]
    ],
    "removeDevice": [168, [types_1.EmberNodeId, types_1.EmberEUI64, types_1.EmberEUI64],
        [types_1.EmberStatus]
    ],
    "unicastNwkKeyUpdate": [169, [types_1.EmberNodeId, types_1.EmberEUI64, types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "generateCbkeKeys": [164, [],
        [types_1.EmberStatus]
    ],
    "generateCbkeKeysHandler": [158, [],
        [types_1.EmberStatus, types_1.EmberPublicKeyData]
    ],
    "calculateSmacs": [159, [types_1.Bool, types_1.EmberCertificateData, types_1.EmberPublicKeyData],
        [types_1.EmberStatus]
    ],
    "calculateSmacsHandler": [160, [],
        [types_1.EmberStatus, types_1.EmberSmacData, types_1.EmberSmacData]
    ],
    "generateCbkeKeys283k1": [232, [],
        [types_1.EmberStatus]
    ],
    "generateCbkeKeysHandler283k1": [233, [],
        [types_1.EmberStatus, types_1.EmberPublicKey283k1Data]
    ],
    "calculateSmacs283k1": [234, [types_1.Bool, types_1.EmberCertificate283k1Data, types_1.EmberPublicKey283k1Data],
        [types_1.EmberStatus]
    ],
    "calculateSmacsHandler283k1": [235, [],
        [types_1.EmberStatus, types_1.EmberSmacData, types_1.EmberSmacData]
    ],
    "clearTemporaryDataMaybeStoreLinkKey": [161, [types_1.Bool],
        [types_1.EmberStatus]
    ],
    "clearTemporaryDataMaybeStoreLinkKey283k1": [238, [types_1.Bool],
        [types_1.EmberStatus]
    ],
    "getCertificate": [165, [],
        [types_1.EmberStatus, types_1.EmberCertificateData]
    ],
    "getCertificate283k1": [236, [],
        [types_1.EmberStatus, types_1.EmberCertificate283k1Data]
    ],
    "dsaSign": [166, [types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "dsaSignHandler": [167, [],
        [types_1.EmberStatus, types_1.LVBytes]
    ],
    "dsaVerify": [163, [types_1.EmberMessageDigest, types_1.EmberCertificateData, types_1.EmberSignatureData],
        [types_1.EmberStatus]
    ],
    "dsaVerifyHandler": [120, [],
        [types_1.EmberStatus]
    ],
    "dsaVerify283k1": [176, [types_1.EmberMessageDigest, types_1.EmberCertificate283k1Data, types_1.EmberSignature283k1Data],
        [types_1.EmberStatus]
    ],
    "setPreinstalledCbkeData": [162, [types_1.EmberPublicKeyData, types_1.EmberCertificateData, types_1.EmberPrivateKeyData],
        [types_1.EmberStatus]
    ],
    "setPreinstalledCbkeData283k1": [237,
        [types_1.EmberPublicKey283k1Data, types_1.EmberCertificate283k1Data, types_1.EmberPrivateKey283k1Data],
        [types_1.EmberStatus]
    ],
    "mfglibStart": [131, [types_1.Bool],
        [types_1.EmberStatus]
    ],
    "mfglibEnd": [132, [],
        [types_1.EmberStatus]
    ],
    "mfglibStartTone": [133, [],
        [types_1.EmberStatus]
    ],
    "mfglibStopTone": [134, [],
        [types_1.EmberStatus]
    ],
    "mfglibStartStream": [135, [],
        [types_1.EmberStatus]
    ],
    "mfglibStopStream": [136, [],
        [types_1.EmberStatus]
    ],
    "mfglibSendPacket": [137, [types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "mfglibSetChannel": [138, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "mfglibGetChannel": [139, [],
        [types_1.uint8_t]
    ],
    "mfglibSetPower": [140, [types_1.uint16_t, types_1.int8s],
        [types_1.EmberStatus]
    ],
    "mfglibGetPower": [141, [],
        [types_1.int8s]
    ],
    "mfglibRxHandler": [142, [],
        [types_1.uint8_t, types_1.int8s, types_1.LVBytes]
    ],
    "launchStandaloneBootloader": [143, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "sendBootloadMessage": [144, [types_1.Bool, types_1.EmberEUI64, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "getStandaloneBootloaderVersionPlatMicroPhy": [145, [],
        [types_1.uint16_t, types_1.uint8_t, types_1.uint8_t, types_1.uint8_t]
    ],
    "incomingBootloadMessageHandler": [146, [],
        [types_1.EmberEUI64, types_1.uint8_t, types_1.int8s, types_1.LVBytes]
    ],
    "bootloadTransmitCompleteHandler": [147, [],
        [types_1.EmberStatus, types_1.LVBytes]
    ],
    "aesEncrypt": [148, [types_1.fixed_list(16, types_1.uint8_t), types_1.fixed_list(16, types_1.uint8_t)],
        [types_1.fixed_list(16, types_1.uint8_t)]
    ],
    "overrideCurrentChannel": [149, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "zllNetworkOps": [178, [types_1.EmberZllNetwork, types_1.EzspZllNetworkOperation, types_1.int8s],
        [types_1.EmberStatus]
    ],
    "zllSetInitialSecurityState": [179, [types_1.EmberKeyData, types_1.EmberZllInitialSecurityState],
        [types_1.EmberStatus]
    ],
    "zllStartScan": [180, [types_1.uint32_t, types_1.int8s, types_1.EmberNodeType],
        [types_1.EmberStatus]
    ],
    "zllSetRxOnWhenIdle": [181, [types_1.uint16_t],
        [types_1.EmberStatus]
    ],
    "zllNetworkFoundHandler": [182, [],
        [types_1.EmberZllNetwork, types_1.Bool, types_1.EmberZllDeviceInfoRecord, types_1.uint8_t, types_1.int8s]
    ],
    "zllScanCompleteHandler": [183, [],
        [types_1.EmberStatus]
    ],
    "zllAddressAssignmentHandler": [184, [],
        [types_1.EmberZllAddressAssignment, types_1.uint8_t, types_1.int8s]
    ],
    "setLogicalAndRadioChannel": [185, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "getLogicalChannel": [186, [],
        [types_1.uint8_t]
    ],
    "zllTouchLinkTargetHandler": [187, [],
        [types_1.EmberZllNetwork]
    ],
    "zllGetTokens": [188, [],
        [types_1.EmberTokTypeStackZllData, types_1.EmberTokTypeStackZllSecurity]
    ],
    "zllSetDataToken": [189, [types_1.EmberTokTypeStackZllData],
        []
    ],
    "zllSetNonZllNetwork": [191, [],
        []
    ],
    "isZllNetwork": [190, [],
        [types_1.Bool]
    ],
    "rf4ceSetPairingTableEntry": [208, [types_1.uint8_t, types_1.EmberRf4cePairingTableEntry],
        [types_1.EmberStatus]
    ],
    "rf4ceGetPairingTableEntry": [209, [types_1.uint8_t],
        [types_1.EmberStatus, types_1.EmberRf4cePairingTableEntry]
    ],
    "rf4ceDeletePairingTableEntry": [210, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "rf4ceKeyUpdate": [211, [types_1.uint8_t, types_1.EmberKeyData],
        [types_1.EmberStatus]
    ],
    "rf4ceSend": [212, [types_1.uint8_t, types_1.uint8_t, types_1.uint16_t, types_1.EmberRf4ceTxOption, types_1.uint8_t, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "rf4ceIncomingMessageHandler": [213, [],
        [types_1.uint8_t, types_1.uint8_t, types_1.uint16_t, types_1.EmberRf4ceTxOption, types_1.LVBytes]
    ],
    "rf4ceMessageSentHandler": [214, [],
        [types_1.EmberStatus, types_1.uint8_t, types_1.EmberRf4ceTxOption, types_1.uint8_t, types_1.uint16_t, types_1.uint8_t, types_1.LVBytes]
    ],
    "rf4ceStart": [215, [types_1.EmberRf4ceNodeCapabilities, types_1.EmberRf4ceVendorInfo, types_1.int8s],
        [types_1.EmberStatus]
    ],
    "rf4ceStop": [216, [],
        [types_1.EmberStatus]
    ],
    "rf4ceDiscovery": [217, [types_1.EmberPanId, types_1.EmberNodeId, types_1.uint8_t, types_1.uint16_t, types_1.LVBytes],
        [types_1.EmberStatus]
    ],
    "rf4ceDiscoveryCompleteHandler": [218, [],
        [types_1.EmberStatus]
    ],
    "rf4ceDiscoveryRequestHandler": [219, [],
        [types_1.EmberEUI64, types_1.uint8_t, types_1.EmberRf4ceVendorInfo, types_1.EmberRf4ceApplicationInfo, types_1.uint8_t, types_1.uint8_t]
    ],
    "rf4ceDiscoveryResponseHandler": [220, [],
        [types_1.Bool, types_1.uint8_t, types_1.EmberPanId, types_1.EmberEUI64, types_1.uint8_t, types_1.EmberRf4ceVendorInfo,
            types_1.EmberRf4ceApplicationInfo, types_1.uint8_t, types_1.uint8_t]
    ],
    "rf4ceEnableAutoDiscoveryResponse": [221, [types_1.uint16_t],
        [types_1.EmberStatus]
    ],
    "rf4ceAutoDiscoveryResponseCompleteHandler": [222, [],
        [types_1.EmberStatus, types_1.EmberEUI64, types_1.uint8_t, types_1.EmberRf4ceVendorInfo, types_1.EmberRf4ceApplicationInfo, types_1.uint8_t]
    ],
    "rf4cePair": [223, [types_1.uint8_t, types_1.EmberPanId, types_1.EmberEUI64, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "rf4cePairCompleteHandler": [224, [],
        [types_1.EmberStatus, types_1.uint8_t, types_1.EmberRf4ceVendorInfo, types_1.EmberRf4ceApplicationInfo]
    ],
    "rf4cePairRequestHandler": [225, [],
        [types_1.EmberStatus, types_1.uint8_t, types_1.EmberEUI64, types_1.uint8_t, types_1.EmberRf4ceVendorInfo, types_1.EmberRf4ceApplicationInfo, types_1.uint8_t]
    ],
    "rf4ceUnpair": [226, [types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "rf4ceUnpairHandler": [227, [],
        [types_1.uint8_t]
    ],
    "rf4ceUnpairCompleteHandler": [228, [],
        [types_1.uint8_t]
    ],
    "rf4ceSetPowerSavingParameters": [229, [types_1.uint32_t, types_1.uint32_t],
        [types_1.EmberStatus]
    ],
    "rf4ceSetFrequencyAgilityParameters": [230, [types_1.uint8_t, types_1.uint8_t, types_1.int8s, types_1.uint16_t, types_1.uint8_t],
        [types_1.EmberStatus]
    ],
    "rf4ceSetApplicationInfo": [231, [types_1.EmberRf4ceApplicationInfo],
        [types_1.EmberStatus]
    ],
    "rf4ceGetApplicationInfo": [239, [],
        [types_1.EmberStatus, types_1.EmberRf4ceApplicationInfo]
    ],
    "rf4ceGetMaxPayload": [243, [types_1.uint8_t, types_1.EmberRf4ceTxOption],
        [types_1.uint8_t]
    ],
    "rf4ceGetNetworkParameters": [244, [],
        [types_1.EmberStatus, types_1.EmberNodeType, types_1.EmberNetworkParameters]
    ],
    "gpProxyTableProcessGpPairing": [201,
        [types_1.uint32_t, types_1.EmberGpAddress, types_1.uint8_t, types_1.uint16_t, types_1.uint16_t, types_1.uint16_t,
            types_1.fixed_list(8, types_1.uint8_t), types_1.EmberKeyData],
        []
    ],
    "dGpSend": [198, [types_1.Bool, types_1.Bool, types_1.EmberGpAddress, types_1.uint8_t, types_1.LVBytes, types_1.uint8_t, types_1.uint16_t],
        [types_1.EmberStatus]
    ],
    "dGpSentHandler": [199, [],
        [types_1.EmberStatus, types_1.uint8_t]
    ],
    "gpepIncomingMessageHandler": [197, [],
        [types_1.EmberStatus, types_1.uint8_t, types_1.uint8_t, types_1.EmberGpAddress, types_1.EmberGpSecurityLevel, types_1.EmberGpKeyType,
            types_1.Bool, types_1.Bool, types_1.uint32_t, types_1.uint8_t, types_1.uint32_t, types_1.EmberGpSinkListEntry, types_1.LVBytes]
    ],
    "changeSourceRouteHandler": [196, [], [types_1.EmberNodeId, types_1.EmberNodeId]],
    "setSourceRouteDiscoveryMode": [0x005A, [types_1.uint8_t,], [types_1.uint32_t,]],
};
//// EmberZDOCmd
/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
exports.ZDO_COMMANDS = {
    "Node_Desc_req": [0x0002, [types_1.uint8_t, types_1.EmberNodeId], [types_1.EmberStatus]],
    "Node_Desc_rsp": [0x8002, [types_1.uint8_t, types_1.EmberStatus, types_1.EmberNodeId, types_1.EmberNodeDescriptor], []],
    "Simple_Desc_req": [0x0004, [types_1.uint8_t, types_1.EmberNodeId, types_1.uint8_t], [types_1.EmberStatus]],
    "Simple_Desc_rsp": [0x8004, [types_1.uint8_t, types_1.EmberStatus, types_1.EmberNodeId, types_1.uint8_t, types_1.EmberSimpleDescriptor], []],
    "Active_EP_req": [0x0005, [types_1.uint8_t, types_1.EmberNodeId], [types_1.EmberStatus]],
    "Active_EP_rsp": [0x8005, [types_1.EmberStatus, types_1.uint8_t, types_1.EmberNodeId, types_1.LVBytes], []],
    "Bind_req": [0x0021, [types_1.uint8_t, types_1.EmberEUI64, types_1.uint8_t, types_1.uint16_t, types_1.EmberMultiAddress], [types_1.EmberStatus]],
    "Bind_rsp": [0x8021, [types_1.EmberStatus], []],
    "Unbind_req": [0x0022, [types_1.uint8_t, types_1.EmberEUI64, types_1.uint8_t, types_1.uint16_t, types_1.EmberMultiAddress], [types_1.EmberStatus]],
    "Unbind_rsp": [0x8022, [types_1.EmberStatus], []],
    "Mgmt_Leave_req": [0x0034, [types_1.uint8_t, types_1.EmberEUI64, types_1.uint8_t], [types_1.EmberStatus]],
    "Mgmt_Leave_rsp": [0x8034, [types_1.EmberStatus], []],
    "Mgmt_Lqi_req": [0x0031, [types_1.uint8_t, types_1.uint8_t], [types_1.EmberStatus]],
    "Mgmt_Lqi_rsp": [0x8031, [types_1.uint8_t, types_1.EmberStatus, types_1.EmberNeighbors], [types_1.EmberStatus]],
};
//# sourceMappingURL=commands.js.map