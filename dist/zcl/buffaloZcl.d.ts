import { Buffalo, TsType } from '../buffalo';
import { BuffaloZclOptions } from './tstype';
declare class BuffaloZcl extends Buffalo {
    private readUseDataType;
    private writeUseDataType;
    private readArray;
    private writeArray;
    private readStruct;
    private readOctetStr;
    private readCharStr;
    private writeCharStr;
    private readLongCharStr;
    private writeLongCharStr;
    private writeOctetStr;
    private readExtensionFieldSets;
    private writeExtensionFieldSets;
    private writeListZoneInfo;
    private readListZoneInfo;
    private readListThermoTransitions;
    private writeListThermoTransitions;
    private readGdpFrame;
    private readListTuyaDataPointValues;
    private writeListTuyaDataPointValues;
    private readUInt40;
    private writeUInt40;
    private readUInt48;
    private writeUInt48;
    private readUInt56;
    private writeUInt56;
    private readUInt64;
    private writeUInt64;
    private writeStructuredSelector;
    write(type: string, value: TsType.Value, options: BuffaloZclOptions): void;
    read(type: string, options: BuffaloZclOptions): TsType.Value;
}
export default BuffaloZcl;
//# sourceMappingURL=buffaloZcl.d.ts.map