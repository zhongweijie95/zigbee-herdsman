"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const sqlite3_1 = __importDefault(require("sqlite3"));
const debug_1 = __importDefault(require("debug"));
const debug = debug_1.default("zigbee-herdsman:controller:database");
class SqliteDB {
    constructor(path, db) {
        this.path = path;
        SqliteDB.db = db;
    }
    static open(path) {
        const db = new sqlite3_1.default.Database(path);
        return new SqliteDB(path, db);
    }
    static printErrorInfo(err) {
        debug("Error Message:" + err.message);
    }
    createTable(sql) {
        SqliteDB.db.serialize(function () {
            SqliteDB.db.run(sql, function (err) {
                if (null != err) {
                    SqliteDB.printErrorInfo(err);
                    return;
                }
            });
        });
    }
    // tilesData format; [[level, column, row, content], [level, column, row, content]]
    insertData(sql, objects) {
        SqliteDB.db.serialize(function () {
            var stmt = SqliteDB.db.prepare(sql);
            for (var i = 0; i < objects.length; ++i) {
                stmt.run(objects[i]);
            }
            stmt.finalize();
        });
    }
    ;
    queryData(sql, callback) {
        SqliteDB.db.all(sql, function (err, rows) {
            if (null != err) {
                SqliteDB.printErrorInfo(err);
                return;
            }
            // deal query data.
            if (callback) {
                callback(rows);
            }
        });
    }
    executeSql(sql, params) {
        SqliteDB.db.run(sql, params, function (err) {
            if (null != err) {
                SqliteDB.printErrorInfo(err);
            }
        });
    }
    close() {
        SqliteDB.db.close();
    }
}
class Database {
    constructor(entries, path) {
        this.entries = entries;
        this.path = path;
    }
    static open(path) {
        const entries = {};
        if (fs_1.default.existsSync(path)) {
            const db = SqliteDB.open(path);
            db.queryData("SELECT json FROM config where id == 1", (row) => {
                const rows = row[0].json.split('\n').map((r) => r.trim()).filter((r) => r != '');
                for (const row of rows) {
                    const json = JSON.parse(row);
                    if (json.hasOwnProperty('id')) {
                        entries[json.id] = json;
                    }
                }
            });
            db.close();
        }
        else {
            const db = SqliteDB.open(path);
            db.createTable("CREATE TABLE config (id integer, json TEXT)");
            db.insertData("INSERT INTO config VALUES (?, ?)", [[1, '{}']]);
            db.close();
        }
        return new Database(entries, path);
    }
    getEntries(type) {
        return Object.values(this.entries).filter(e => type.includes(e.type));
    }
    insert(DatabaseEntry) {
        if (this.entries[DatabaseEntry.id]) {
            throw new Error(`DatabaseEntry with ID '${DatabaseEntry.id}' already exists`);
        }
        this.entries[DatabaseEntry.id] = DatabaseEntry;
        this.write();
    }
    update(DatabaseEntry, write) {
        if (!this.entries[DatabaseEntry.id]) {
            throw new Error(`DatabaseEntry with ID '${DatabaseEntry.id}' does not exist`);
        }
        this.entries[DatabaseEntry.id] = DatabaseEntry;
        if (write) {
            this.write();
        }
    }
    remove(ID) {
        if (!this.entries[ID]) {
            throw new Error(`DatabaseEntry with ID '${ID}' does not exist`);
        }
        delete this.entries[ID];
        this.write();
    }
    has(ID) {
        return this.entries.hasOwnProperty(ID);
    }
    newID() {
        for (let i = 1; i < 100000; i++) {
            if (!this.entries[i]) {
                return i;
            }
        }
    }
    write() {
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
exports.default = Database;
//# sourceMappingURL=database.js.map