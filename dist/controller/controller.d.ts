/// <reference types="node" />
import events from 'events';
import { TsType as AdapterTsType } from '../adapter';
import { Device } from './model';
import { DeviceType } from './tstype';
import Group from './model/group';
import { LoggerStub } from "./logger-stub";
interface Options {
    network: AdapterTsType.NetworkOptions;
    serialPort: AdapterTsType.SerialPortOptions;
    databasePath: string;
    databaseBackupPath: string;
    backupPath: string;
    adapter: AdapterTsType.AdapterOptions;
    /**
     * This lambda can be used by an application to explictly reject or accept an incoming device.
     * When false is returned zigbee-herdsman will not start the interview process and immidiately
     * try to remove the device from the network.
     */
    acceptJoiningDeviceHandler: (ieeeAddr: string) => Promise<boolean>;
}
/**
 * @noInheritDoc
 */
declare class Controller extends events.EventEmitter {
    private options;
    private database;
    private adapter;
    private greenPower;
    private permitJoinNetworkClosedTimer;
    private permitJoinTimeoutTimer;
    private permitJoinTimeout;
    private backupTimer;
    private databaseSaveTimer;
    private touchlink;
    private stopping;
    private networkParametersCached;
    private logger?;
    /**
     * Create a controller
     *
     * To auto detect the port provide `null` for `options.serialPort.path`
     */
    constructor(options: Options, logger?: LoggerStub);
    /**
     * Start the Herdsman controller
     */
    start(): Promise<AdapterTsType.StartResult>;
    touchlinkIdentify(ieeeAddr: string, channel: number): Promise<void>;
    touchlinkScan(): Promise<{
        ieeeAddr: string;
        channel: number;
    }[]>;
    touchlinkFactoryReset(ieeeAddr: string, channel: number): Promise<boolean>;
    touchlinkFactoryResetFirst(): Promise<boolean>;
    permitJoin(permit: boolean, device?: Device, time?: number): Promise<void>;
    permitJoinInternal(permit: boolean, reason: 'manual' | 'timer_expired', device?: Device, time?: number): Promise<void>;
    getPermitJoin(): boolean;
    getPermitJoinTimeout(): number;
    isStopping(): boolean;
    stop(): Promise<void>;
    private databaseSave;
    private backup;
    reset(type: 'soft' | 'hard'): Promise<void>;
    getCoordinatorVersion(): Promise<AdapterTsType.CoordinatorVersion>;
    getNetworkParameters(): Promise<AdapterTsType.NetworkParameters>;
    /**
     * Get all devices
     */
    getDevices(): Device[];
    /**
     * Get all devices with a specific type
     */
    getDevicesByType(type: DeviceType): Device[];
    /**
     * Get device by ieeeAddr
     */
    getDeviceByIeeeAddr(ieeeAddr: string): Device;
    /**
     * Get device by networkAddress
     */
    getDeviceByNetworkAddress(networkAddress: number): Device;
    /**
     * Get group by ID
     */
    getGroupByID(groupID: number): Group;
    /**
     * Get all groups
     */
    getGroups(): Group[];
    /**
     * Create a Group
     */
    createGroup(groupID: number): Group;
    /**
     *  Set transmit power of the adapter
     */
    setTransmitPower(value: number): Promise<void>;
    private onNetworkAddress;
    private onDeviceAnnounce;
    private onDeviceLeave;
    private onAdapterDisconnected;
    private onDeviceJoinedGreenPower;
    private selfAndDeviceEmit;
    private onDeviceJoined;
    private isZclDataPayload;
    private onZclOrRawData;
}
export default Controller;
//# sourceMappingURL=controller.d.ts.map