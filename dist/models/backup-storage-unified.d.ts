/**
 * Unified configuration storage model based on
 * [zigpy/open-coordinator-backup](https://github.com/zigpy/open-coordinator-backup).
 *
 * This format should allow for seamless migration between adapter types or event vendors.
 */
export interface UnifiedBackupStorage {
    metadata: {
        format: "zigpy/open-coordinator-backup";
        version: 1;
        source: string;
        internal: {
            date: string;
            znpVersion: number;
            [key: string]: any;
        };
    };
    stack_specific?: {
        zstack?: {
            tclk_seed?: string;
        };
    };
    coordinator_ieee: string;
    pan_id: string;
    extended_pan_id: string;
    security_level: number;
    nwk_update_id: number;
    channel: number;
    channel_mask: number[];
    network_key: {
        key: string;
        sequence_number: number;
        frame_counter: number;
    };
    devices: {
        nwk_address: string | null;
        ieee_address: string;
        is_child: boolean;
        link_key: {
            key: string;
            rx_counter: number;
            tx_counter: number;
        } | null;
    }[];
}
//# sourceMappingURL=backup-storage-unified.d.ts.map