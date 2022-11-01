import fs from 'fs';
import {DatabaseEntry, EntityType} from './tstype';
import sqlite3 from 'sqlite3';
import Debug from "debug";
const debug = Debug("zigbee-herdsman:controller:database");

class SqliteDB {
    private path: string;
    private static db: sqlite3.Database;

    private constructor(path: string, db: sqlite3.Database) {
        this.path = path;
        SqliteDB.db = db;        
    }

    public static open(path: string): SqliteDB {
        const db = new sqlite3.Database(path);
        return new SqliteDB(path, db);
    }

    private static printErrorInfo(err: Error) {
        debug("Error Message:" + err.message);
    }

    public createTable (sql: string) {
        SqliteDB.db.serialize(function(){
            SqliteDB.db.run(sql, function(err: Error){
                if(null != err){
                    SqliteDB.printErrorInfo(err);
                    return;
                }
            });
        });
    } 
    
    /// tilesData format; [[level, column, row, content], [level, column, row, content]]
    public insertData(sql: string, objects: any){
        SqliteDB.db.serialize(function(){
            var stmt = SqliteDB.db.prepare(sql);
            for(var i = 0; i < objects.length; ++i){
                stmt.run(objects[i]);
            }
        
            stmt.finalize();
        });
    };

    public queryData(sql: string, callback?: (rows: any) => void){
        SqliteDB.db.all(sql, function(err, rows){
            if(null != err){
                SqliteDB.printErrorInfo(err);
                return;
            }
     
            /// deal query data.
            if(callback){
                callback(rows);
            }
        });
    }

    public executeSql(sql: string, params?: any){
        SqliteDB.db.run(sql, params, function(err: Error){
            if(null != err){
                SqliteDB.printErrorInfo(err);
            }
       });
    }

    public close() {
        SqliteDB.db.close();
    }      
}

class Database {
    private entries: {[id: number]: DatabaseEntry};
    private path: string;

    private constructor(entries: {[id: number]: DatabaseEntry}, path: string) {
        this.entries = entries;
        this.path = path;
    }

    public static open(path: string): Database {
        const entries: {[id: number]: DatabaseEntry} = {};

        if (fs.existsSync(path)) {
            const db = SqliteDB.open(path);
            db.queryData("SELECT json FROM config where id == 1", (row) => {
                const rows = (row[0].json as string).split('\n').map((r) => r.trim()).filter((r) => r != '');
                for (const row of rows) {
                    const json = JSON.parse(row);
                    if (json.hasOwnProperty('id')) {
                        entries[json.id] = json;
                    }
                }
            });
            db.close();
        }else{ 
            const db = SqliteDB.open(path);
            db.createTable("CREATE TABLE config (id integer, json TEXT)");
            db.insertData("INSERT INTO config VALUES (?, ?)", [[1, '{}']]);
            db.close();            
        }

        return new Database(entries, path);
    }

    public getEntries(type: EntityType[]): DatabaseEntry[] {
        return Object.values(this.entries).filter(e => type.includes(e.type));
    }

    public insert(DatabaseEntry: DatabaseEntry): void {
        if (this.entries[DatabaseEntry.id]) {
            throw new Error(`DatabaseEntry with ID '${DatabaseEntry.id}' already exists`);
        }

        this.entries[DatabaseEntry.id] = DatabaseEntry;
        this.write();
    }

    public update(DatabaseEntry: DatabaseEntry, write: boolean): void {
        if (!this.entries[DatabaseEntry.id]) {
            throw new Error(`DatabaseEntry with ID '${DatabaseEntry.id}' does not exist`);
        }

        this.entries[DatabaseEntry.id] = DatabaseEntry;

        if (write) {
            this.write();
        }
    }

    public remove(ID: number): void {
        if (!this.entries[ID]) {
            throw new Error(`DatabaseEntry with ID '${ID}' does not exist`);
        }

        delete this.entries[ID];
        this.write();
    }

    public has(ID: number): boolean {
        return this.entries.hasOwnProperty(ID);
    }

    public newID(): number {
        for (let i = 1; i < 100000; i++) {
            if (!this.entries[i]) {
                return i;
            }
        }
    }

    public write(): void {
        const lines = [];
        for (const DatabaseEntry of Object.values(this.entries)) {
            const json = JSON.stringify(DatabaseEntry);
            lines.push(json);
        }



        const db = SqliteDB.open(this.path);
        db.executeSql("UPDATE config SET json = ? where id == 1", lines.join('\n'));
        db.close();
    }
}

export default Database;
