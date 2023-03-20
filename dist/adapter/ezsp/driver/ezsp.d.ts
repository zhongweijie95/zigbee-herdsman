/// <reference types="node" />
import * as t from './types';
import { EmberOutgoingMessageType, EzspPolicyId } from './types/named';
import { EventEmitter } from 'events';
import { EmberApsFrame } from './types/struct';
declare type EZSPFrame = {
    sequence: number;
    frameId: number;
    frameName: string;
    payload: any;
};
export declare class Ezsp extends EventEmitter {
    ezspV: number;
    cmdSeq: number;
    COMMANDS_BY_ID: Map<number, {
        name: string;
        inArgs: any[];
        outArgs: any[];
    }>;
    private serialDriver;
    private waitress;
    private queue;
    private watchdogTimer;
    private failures;
    constructor();
    connect(path: string, options: Record<string, number | boolean>): Promise<void>;
    close(): Promise<void>;
    private onFrameReceived;
    version(): Promise<number>;
    networkInit(): Promise<boolean>;
    leaveNetwork(): Promise<number>;
    setConfigurationValue(configId: number, value: any): Promise<void>;
    getConfigurationValue(configId: number): Promise<number>;
    getMulticastTableEntry(index: number): Promise<t.EmberMulticastTableEntry>;
    setMulticastTableEntry(index: number, entry: t.EmberMulticastTableEntry): Promise<number[]>;
    setInitialSecurityState(entry: t.EmberInitialSecurityState): Promise<number[]>;
    getCurrentSecurityState(): Promise<any[]>;
    setValue(valueId: t.EzspValueId, value: any): Promise<number[]>;
    getValue(valueId: t.EzspValueId): Promise<Buffer>;
    setPolicy(policyId: EzspPolicyId, value: any): Promise<number[]>;
    updateConfig(): Promise<void>;
    updatePolicies(): Promise<void>;
    makeZDOframe(name: string, ...args: any[]): Buffer;
    private makeFrame;
    private command;
    formNetwork(...args: any[]): Promise<number>;
    execCommand(name: string, ...args: any[]): any;
    parse_frame_payload(name: string, data: Buffer): any[];
    sendUnicast(direct: EmberOutgoingMessageType, nwk: number, apsFrame: EmberApsFrame, seq: number, data: Buffer): any;
    sendMulticast(apsFrame: EmberApsFrame, seq: number, data: Buffer): any;
    setSourceRouting(): Promise<void>;
    waitFor(frameId: number, sequence: number | null, timeout?: number): {
        start: () => {
            promise: Promise<EZSPFrame>;
            ID: number;
        };
        ID: number;
    };
    private waitressTimeoutFormatter;
    private waitressValidator;
    private watchdogHandler;
}
export {};
//# sourceMappingURL=ezsp.d.ts.map