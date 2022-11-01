import fs from 'fs';
import {DatabaseEntry, EntityType} from './tstype';
import sqlite3 from 'sqlite3';


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
            const db = new sqlite3.Database(path);

            db.serialize(() => {
                db.get("SELECT json FROM config where id == 1", (err, row) => {
                    //console.log(row.id + ": " + row.info);
                    const rows = (row.json as string).split('\n').map((r) => r.trim()).filter((r) => r != '');
                    for (const row of rows) {
                        const json = JSON.parse(row);
                        if (json.hasOwnProperty('id')) {
                            entries[json.id] = json;
                        }
                    }                                            
                });            
            });

            db.close();
        }else{
            const db = new sqlite3.Database(path);

            db.serialize(() => {
                db.run("CREATE TABLE config (id integer, json TEXT)");

                /*const stmt = db.prepare("INSERT INTO json VALUES (?)");
                stmt.run("{}");
                stmt.finalize();*/
                
                db.run("INSERT INTO config VALUES (1, '{}')");
            });

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
        /*const tmpPath = this.path + '.tmp';
        fs.writeFileSync(tmpPath, lines.join('\n'));
        fs.renameSync(tmpPath, this.path);*/

        const db = new sqlite3.Database(this.path);

        db.serialize(() => {
            const lines = [];
            for (const DatabaseEntry of Object.values(this.entries)) {
                const json = JSON.stringify(DatabaseEntry);
                lines.push(json);
            }

            db.run("UPDATE config SET json = ? where id == 1", lines.join('\n'));
        });

        db.close();

    }
}

export default Database;
