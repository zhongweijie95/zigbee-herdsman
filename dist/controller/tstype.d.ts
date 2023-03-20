interface KeyValue {
    [s: string]: any;
}
declare type SendRequestWhen = 'immediate' | 'fastpoll' | 'active';
declare type DeviceType = 'Coordinator' | 'Router' | 'EndDevice' | 'Unknown' | 'GreenPower';
declare type EntityType = DeviceType | 'Group';
interface DatabaseEntry {
    id: number;
    type: EntityType;
    [s: string]: any;
}
declare enum GreenPowerEvents {
    deviceJoined = "deviceJoined"
}
interface GreenPowerDeviceJoinedPayload {
    sourceID: number;
    deviceID: number;
    networkAddress: number;
}
export { KeyValue, DatabaseEntry, EntityType, DeviceType, GreenPowerEvents, GreenPowerDeviceJoinedPayload, SendRequestWhen };
//# sourceMappingURL=tstype.d.ts.map