import { NetworkOptions, SerialPortOptions, Coordinator, CoordinatorVersion, NodeDescriptor, ActiveEndpoints, SimpleDescriptor, LQI, RoutingTable, NetworkParameters, StartResult, AdapterOptions } from '../../tstype';
import Adapter from '../../adapter';
import { ZclFrame, FrameType, Direction } from '../../../zcl';
import * as Events from '../../events';
import { LoggerStub } from "../../../controller/logger-stub";
import * as Models from "../../../models";
declare class DeconzAdapter extends Adapter {
    private driver;
    private queue;
    private openRequestsQueue;
    private transactionID;
    private frameParserEvent;
    private joinPermitted;
    private fwVersion;
    private waitress;
    private TX_OPTIONS;
    constructor(networkOptions: NetworkOptions, serialPortOptions: SerialPortOptions, backupPath: string, adapterOptions: AdapterOptions, logger?: LoggerStub);
    static isValidPath(path: string): Promise<boolean>;
    static autoDetectPath(): Promise<string>;
    /**
     * Adapter methods
     */
    start(): Promise<StartResult>;
    stop(): Promise<void>;
    getCoordinator(): Promise<Coordinator>;
    permitJoin(seconds: number, networkAddress: number): Promise<void>;
    getCoordinatorVersion(): Promise<CoordinatorVersion>;
    reset(type: 'soft' | 'hard'): Promise<void>;
    lqi(networkAddress: number): Promise<LQI>;
    routingTable(networkAddress: number): Promise<RoutingTable>;
    nodeDescriptor(networkAddress: number): Promise<NodeDescriptor>;
    activeEndpoints(networkAddress: number): Promise<ActiveEndpoints>;
    simpleDescriptor(networkAddress: number, endpointID: number): Promise<SimpleDescriptor>;
    private checkCoordinatorSimpleDescriptor;
    waitFor(networkAddress: number, endpoint: number, frameType: FrameType, direction: Direction, transactionSequenceNumber: number, clusterID: number, commandIdentifier: number, timeout: number): {
        promise: Promise<Events.ZclDataPayload>;
        cancel: () => void;
    };
    sendZclFrameToEndpoint(ieeeAddr: string, networkAddress: number, endpoint: number, zclFrame: ZclFrame, timeout: number, disableResponse: boolean, disableRecovery: boolean, sourceEndpoint?: number): Promise<Events.ZclDataPayload>;
    sendZclFrameToGroup(groupID: number, zclFrame: ZclFrame): Promise<void>;
    sendZclFrameToAll(endpoint: number, zclFrame: ZclFrame, sourceEndpoint: number): Promise<void>;
    bind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint?: number): Promise<void>;
    unbind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint: number): Promise<void>;
    removeDevice(networkAddress: number, ieeeAddr: string): Promise<void>;
    supportsBackup(): Promise<boolean>;
    backup(): Promise<Models.Backup>;
    getNetworkParameters(): Promise<NetworkParameters>;
    restoreChannelInterPAN(): Promise<void>;
    sendZclFrameInterPANToIeeeAddr(zclFrame: ZclFrame, ieeeAddr: string): Promise<void>;
    sendZclFrameInterPANBroadcast(zclFrame: ZclFrame, timeout: number): Promise<Events.ZclDataPayload>;
    sendZclFrameInterPANBroadcastWithResponse(zclFrame: ZclFrame, timeout: number): Promise<Events.ZclDataPayload>;
    setChannelInterPAN(channel: number): Promise<void>;
    setTransmitPower(value: number): Promise<void>;
    sendZclFrameInterPANIeeeAddr(zclFrame: ZclFrame, ieeeAddr: any): Promise<void>;
    /**
     * Private methods
     */
    private sleep;
    private waitForData;
    private checkReceivedGreenPowerIndication;
    private checkReceivedDataPayload;
    private nextTransactionID;
    private waitressTimeoutFormatter;
    private waitressValidator;
}
export default DeconzAdapter;
//# sourceMappingURL=deconzAdapter.d.ts.map