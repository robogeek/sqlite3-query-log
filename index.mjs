
import { Base64 } from 'js-base64';
import fs, { promises as fsp } from 'node:fs';

/**
 * Install a listener on the database object, which outputs
 * query/performance data to the logfile.  The compat parameter
 * handles the API of different SQLITE3 implementations.
 * 
 * The logfile format is tab-separated, two fields:
 * 
 * 1- BASE64 encoded string containing the SQL
 * 2- INTEGER showing the miliseconds required to
 *    execute the SQL statement
 * 
 * This format is chosen for simplicity.  By Base64 encoding
 * the SQL, we avoid having to escape tab characters in the SQL, plus
 * the Base64 value is easily encoded and decoded.
 * 
 * The db parameter supports a Database object.
 * 
 * The logfn parameter is the filename for logging output.
 * Log entries are made immediately as they occur, with the
 * file being appended to.  Because writes are done
 * in append mode, you should probably delete an existing
 * logfile before running your application.
 * 
 * The compat field supports these values:
 * 
 * - node-sqlite (default) refers to the traditional SQLITE3
 *     driver for Node.js
 * - better-sqlite3 would refer to better-sqlite3, but it
 *      cannot be supported
 * - node:sqlite would refer to the SQLITE3 in Node.js 24
 *      and later, but it cannot be supported
 * - bun:sqlite would refer to the SQLITE3 in Bun,
 *      but it cannot be supported
 * 
 * It was intended that this tool support all SQLITE3 implementations
 * in the Node.js ecosystem.  But, only node-sqlite3 has an API
 * to provide per-query timing.  For the other implementations,
 * an exception is thrown saying that it's not supported.
 * 
 * @param {*} db 
 * @param {*} logfn 
 * @param {*} compat 
 */
export default function install(db, logfn, compat) {


    const _compat = compat ? compat : "node-sqlite3";

    if (compat === 'node-sqlite3') {
        db.on('profile', (sql, time) => {
            fs.writeFileSync(logfn,
                `${Base64.encode(sql)}\t${time}\n`,
                { flag: "a+" }
            );
        });
    } else if (compat === 'better-sqlite3') {
        throw new Error(`better-sqlite3 not supported`);
    } else if (compat === 'node:sqlite') {
        throw new Error(`node:sqlite not supported`);
    } else if (compat === 'bun:sqlite') {
        throw new Error(`bun:sqlite not supported`);
    }
}
