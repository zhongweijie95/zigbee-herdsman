/// <reference types="node" />
import * as TsType from './../../tstype';
import { Ezsp } from './ezsp';
import { EmberZDOCmd } from './types';
import { EventEmitter } from "events";
import { EmberApsFrame, EmberNetworkParameters } from './types/struct';
import { EmberEUI64 } from './types/named';
import { Queue } from '../../../utils';
interface AddEndpointParameters {
    endpoint?: number;
    profileId?: number;
    deviceId?: number;
    appFlags?: number;
    inputClusters?: number[];
    outputClusters?: number[];
}
declare type EmberFrame = {
    address: number;
    payload: Buffer;
    frame: EmberApsFrame;
};
export declare class Driver extends EventEmitter {
    private direct;
    ezsp: Ezsp;
    private nwkOpt;
    private greenPowerGroup;
    networkParams: EmberNetworkParameters;
    version: {
        product: number;
        majorrel: string;
        minorrel: string;
        maintrel: string;
        revision: string;
    };
    private eui64ToNodeId;
    private eui64ToRelays;
    ieee: EmberEUI64;
    private multicast;
    private waitress;
    queue: Queue;
    private transactionID;
    private port;
    private serialOpt;
    constructor();
    private onReset;
    startup(port: string, serialOpt: Record<string, any>, nwkOpt: TsType.NetworkOptions, greenPowerGroup: number): Promise<void>;
    private needsToBeInitialised;
    private form_network;
    private handleFrame;
    private handleRouteRecord;
    private handleRouteError;
    private handleNodeLeft;
    private handleNodeJoined;
    setNode(nwk: number, ieee: EmberEUI64 | number[]): void;
    request(nwk: number | EmberEUI64, apsFrame: EmberApsFrame, data: Buffer, timeout?: number): Promise<boolean>;
    mrequest(apsFrame: EmberApsFrame, data: Buffer, timeout?: number): Promise<boolean>;
    private nextTransactionID;
    makeApsFrame(clusterId: number): EmberApsFrame;
    zdoRequest(networkAddress: number, requestCmd: EmberZDOCmd, responseCmd: EmberZDOCmd, ...args: any[]): Promise<any>;
    stop(): Promise<void>;
    getLocalEUI64(): Promise<EmberEUI64>;
    networkIdToEUI64(nwk: number): Promise<EmberEUI64>;
    permitJoining(seconds: number): Promise<any>;
    makeZDOframe(name: string, ...args: any[]): Buffer;
    parse_frame_payload(name: string, obj: Buffer): any[];
    addEndpoint({ endpoint, profileId, deviceId, appFlags, inputClusters, outputClusters }: AddEndpointParameters): Promise<void>;
    waitFor(address: number, clusterId: number, sequence: number, timeout?: number): {
        start: () => {
            promise: Promise<EmberFrame>;
            ID: number;
        };
        ID: number;
    };
    private waitressTimeoutFormatter;
    private waitressValidator;
    setRadioPower(value: number): Promise<void>;
    setChannel(channel: number): Promise<void>;
}
export {};
//# sourceMappingURL=driver.d.ts.map