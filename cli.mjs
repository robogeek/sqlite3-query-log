#!/usr/bin/env node

import { program } from 'commander';
import { Base64 } from 'js-base64';
import fs, { promises as fsp } from 'node:fs';
import _package from './package.json' with { type: 'json' };

process.title = 'sqlite3-query-log';
program.version(_package.version);

program
    .command('decode <logfn>')
    .description('Decode the SQL strings, converting to JSON')
    .option('--output <outfn>', 'Output file name.  If not given, will output to stdout.')
    .action(async (logfn, cmdObj) => {

        const data = await fsp.readFile(logfn, 'utf-8');
        const sqlArray = decode(data);

        if (typeof cmdObj.output === 'string') {
            await fsp.writeFile(cmdObj.output, JSON.stringify(sqlArray, undefined, 4), 'utf8');
        } else {
            console.log(JSON.stringify(sqlArray, undefined, 4));
        }
    });

program
    .command('analyze <jsonfile>')
    .option('--threshold <ms>', 'Minimum execution time, miliseconds, for a query to be included')
    .option('--output <outfn>', 'Output file name.  If not given, will output to stdout.')
    .action(async (jsonfile, cmdObj) => {
        const json = await fsp.readFile(jsonfile, 'utf-8');

        const threshold = (typeof cmdObj.threshold === 'string')
                        ? Number.parseInt(cmdObj.threshold)
                        : 0;

        const sqlSummary = new Map();
        for (const item of JSON.parse(json)) {

            if (item.time < threshold) continue;

            let perfData = sqlSummary.get(item.sql);
            if (typeof perfData !== 'undefined') {
                perfData.total += item.time;
                perfData.count ++;
                perfData.avg = perfData.total / perfData.count;
                sqlSummary.set(item.sql, perfData);
            } else {
                sqlSummary.set(item.sql, {
                    sql: item.sql,
                    total: item.time,
                    count: 1,
                    avg: item.time
                });
            }
        }

        let towrite = '';
        sqlSummary.forEach((value, key, map) => {
            // console.log(`${key} => `, value);
            towrite += `

${value.sql}
${value.total}\t${value.count}\t${value.avg}`;
        });
        // console.log(`towrite ${typeof towrite} ${Array.isArray(towrite)} ${towrite.length}`);
        if (typeof cmdObj.output === 'string') {
            await fsp.writeFile(cmdObj.output, towrite, 'utf-8');
        } else {
            console.log(towrite);
        }
    });

function decode(data) {
    const sqlArray = [];

    for (const reading of data.split('\n')) {
        const vals = reading.split('\t');
        const item = {
            sql: Base64.decode(vals[0]),
            time: Number.parseInt(vals[1])
        };
        sqlArray.push(item);
    }
    return sqlArray;
}

program.parse(process.argv);
