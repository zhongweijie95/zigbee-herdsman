/// <reference types="node" />
import * as TsType from './tstype';
import { ZclDataPayload } from './events';
import events from 'events';
import { ZclFrame, FrameType, Direction } from '../zcl';
import { LoggerStub } from "../controller/logger-stub";
import * as Models from "../models";
declare abstract class Adapter extends events.EventEmitter {
    readonly greenPowerGroup = 2948;
    protected networkOptions: TsType.NetworkOptions;
    protected adapterOptions: TsType.AdapterOptions;
    protected serialPortOptions: TsType.SerialPortOptions;
    protected backupPath: string;
    protected logger?: LoggerStub;
    protected constructor(networkOptions: TsType.NetworkOptions, serialPortOptions: TsType.SerialPortOptions, backupPath: string, adapterOptions: TsType.AdapterOptions, logger?: LoggerStub);
    /**
     * Utility
     */
    static create(networkOptions: TsType.NetworkOptions, serialPortOptions: TsType.SerialPortOptions, backupPath: string, adapterOptions: TsType.AdapterOptions, logger?: LoggerStub): Promise<Adapter>;
    abstract start(): Promise<TsType.StartResult>;
    abstract stop(): Promise<void>;
    abstract getCoordinator(): Promise<TsType.Coordinator>;
    abstract getCoordinatorVersion(): Promise<TsType.CoordinatorVersion>;
    abstract reset(type: 'soft' | 'hard'): Promise<void>;
    abstract supportsBackup(): Promise<boolean>;
    abstract backup(): Promise<Models.Backup>;
    abstract getNetworkParameters(): Promise<TsType.NetworkParameters>;
    abstract setTransmitPower(value: number): Promise<void>;
    abstract waitFor(networkAddress: number, endpoint: number, frameType: FrameType, direction: Direction, transactionSequenceNumber: number, clusterID: number, commandIdentifier: number, timeout: number): {
        promise: Promise<ZclDataPayload>;
        cancel: () => void;
    };
    /**
     * ZDO
     */
    abstract permitJoin(seconds: number, networkAddress: number): Promise<void>;
    abstract lqi(networkAddress: number): Promise<TsType.LQI>;
    abstract routingTable(networkAddress: number): Promise<TsType.RoutingTable>;
    abstract nodeDescriptor(networkAddress: number): Promise<TsType.NodeDescriptor>;
    abstract activeEndpoints(networkAddress: number): Promise<TsType.ActiveEndpoints>;
    abstract simpleDescriptor(networkAddress: number, endpointID: number): Promise<TsType.SimpleDescriptor>;
    abstract bind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint?: number): Promise<void>;
    abstract unbind(destinationNetworkAddress: number, sourceIeeeAddress: string, sourceEndpoint: number, clusterID: number, destinationAddressOrGroup: string | number, type: 'endpoint' | 'group', destinationEndpoint: number): Promise<void>;
    abstract removeDevice(networkAddress: number, ieeeAddr: string): Promise<void>;
    /**
     * ZCL
     */
    abstract sendZclFrameToEndpoint(ieeeAddr: string, networkAddress: number, endpoint: number, zclFrame: ZclFrame, timeout: number, disableResponse: boolean, disableRecovery: boolean, sourceEndpoint?: number): Promise<ZclDataPayload>;
    abstract sendZclFrameToGroup(groupID: number, zclFrame: ZclFrame, sourceEndpoint?: number): Promise<void>;
    abstract sendZclFrameToAll(endpoint: number, zclFrame: ZclFrame, sourceEndpoint: number): Promise<void>;
    /**
     * InterPAN
     */
    abstract setChannelInterPAN(channel: number): Promise<void>;
    abstract sendZclFrameInterPANToIeeeAddr(zclFrame: ZclFrame, ieeeAddress: string): Promise<void>;
    abstract sendZclFrameInterPANBroadcast(zclFrame: ZclFrame, timeout: number): Promise<ZclDataPayload>;
    abstract restoreChannelInterPAN(): Promise<void>;
}
export default Adapter;
//# sourceMappingURL=adapter.d.ts.map