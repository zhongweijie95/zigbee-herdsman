import { KeyValue, DeviceType, SendRequestWhen } from '../tstype';
import { Events as AdapterEvents } from '../../adapter';
import Endpoint from './endpoint';
import Entity from './entity';
interface LQI {
    neighbors: {
        ieeeAddr: string;
        networkAddress: number;
        linkquality: number;
        relationship: number;
        depth: number;
    }[];
}
interface RoutingTable {
    table: {
        destinationAddress: number;
        status: string;
        nextHop: number;
    }[];
}
declare class Device extends Entity {
    private readonly ID;
    private _applicationVersion?;
    private _dateCode?;
    private _endpoints;
    private _hardwareVersion?;
    private _ieeeAddr;
    private _interviewCompleted;
    private _interviewing;
    private _lastSeen;
    private _manufacturerID?;
    private _manufacturerName?;
    private _modelID?;
    private _networkAddress;
    private _powerSource?;
    private _softwareBuildID?;
    private _stackVersion?;
    private _type?;
    private _zclVersion?;
    private _linkquality?;
    private _skipDefaultResponse;
    private _skipTimeResponse;
    private _deleted;
    private _defaultSendRequestWhen?;
    get ieeeAddr(): string;
    set ieeeAddr(ieeeAddr: string);
    get applicationVersion(): number;
    set applicationVersion(applicationVersion: number);
    get endpoints(): Endpoint[];
    get interviewCompleted(): boolean;
    get interviewing(): boolean;
    get lastSeen(): number;
    get manufacturerID(): number;
    get isDeleted(): boolean;
    set type(type: DeviceType);
    get type(): DeviceType;
    get dateCode(): string;
    set dateCode(dateCode: string);
    set hardwareVersion(hardwareVersion: number);
    get hardwareVersion(): number;
    get manufacturerName(): string;
    set manufacturerName(manufacturerName: string);
    set modelID(modelID: string);
    get modelID(): string;
    get networkAddress(): number;
    set networkAddress(networkAddress: number);
    get powerSource(): string;
    set powerSource(powerSource: string);
    get softwareBuildID(): string;
    set softwareBuildID(softwareBuildID: string);
    get stackVersion(): number;
    set stackVersion(stackVersion: number);
    get zclVersion(): number;
    set zclVersion(zclVersion: number);
    get linkquality(): number;
    set linkquality(linkquality: number);
    get skipDefaultResponse(): boolean;
    set skipDefaultResponse(skipDefaultResponse: boolean);
    get skipTimeResponse(): boolean;
    set skipTimeResponse(skipTimeResponse: boolean);
    get defaultSendRequestWhen(): SendRequestWhen;
    set defaultSendRequestWhen(defaultSendRequestWhen: SendRequestWhen);
    meta: KeyValue;
    private static devices;
    static readonly ReportablePropertiesMapping: {
        [s: string]: {
            set: (value: string | number, device: Device) => void;
            key: 'modelID' | 'manufacturerName' | 'applicationVersion' | 'zclVersion' | 'powerSource' | 'stackVersion' | 'dateCode' | 'softwareBuildID' | 'hardwareVersion';
        };
    };
    private constructor();
    createEndpoint(ID: number): Endpoint;
    changeIeeeAddress(ieeeAddr: string): void;
    getEndpoint(ID: number): Endpoint;
    getEndpointByDeviceType(deviceType: string): Endpoint;
    implicitCheckin(): void;
    updateLastSeen(): void;
    private hasPendingRequests;
    onZclData(dataPayload: AdapterEvents.ZclDataPayload, endpoint: Endpoint): Promise<void>;
    private static fromDatabaseEntry;
    private toDatabaseEntry;
    save(writeDatabase?: boolean): void;
    private static loadFromDatabaseIfNecessary;
    static byIeeeAddr(ieeeAddr: string, includeDeleted?: boolean): Device;
    static byNetworkAddress(networkAddress: number): Device;
    static byType(type: DeviceType): Device[];
    static all(): Device[];
    undelete(): void;
    static create(type: DeviceType, ieeeAddr: string, networkAddress: number, manufacturerID: number, manufacturerName: string, powerSource: string, modelID: string, interviewCompleted: boolean, endpoints: {
        ID: number;
        profileID: number;
        deviceID: number;
        inputClusters: number[];
        outputClusters: number[];
    }[]): Device;
    interview(): Promise<void>;
    private interviewQuirks;
    private interviewInternal;
    removeFromNetwork(): Promise<void>;
    removeFromDatabase(): Promise<void>;
    lqi(): Promise<LQI>;
    routingTable(): Promise<RoutingTable>;
    ping(disableRecovery?: boolean): Promise<void>;
}
export default Device;
//# sourceMappingURL=device.d.ts.map