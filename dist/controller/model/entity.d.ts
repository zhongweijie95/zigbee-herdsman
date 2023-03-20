/// <reference types="node" />
import Database from '../database';
import { Adapter } from '../../adapter';
import events from 'events';
declare abstract class Entity extends events.EventEmitter {
    protected static database: Database;
    protected static adapter: Adapter;
    static injectDatabase(database: Database): void;
    static injectAdapter(adapter: Adapter): void;
}
export default Entity;
//# sourceMappingURL=entity.d.ts.map