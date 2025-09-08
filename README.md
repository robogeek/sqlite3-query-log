# sqlite3-query-log

SQLite Performance Monitoring for Node.js - Identify slow database queries in your SQLite3 applications

## What is sqlite3-query-log?

A lightweight Node.js package that logs and analyzes SQLite3 query performance, similar
to MySQL's slow query log. Track execution times, identify bottlenecks, and optimize your
database queries with minimal overhead.

Perfect for:

* Performance debugging SQLite applications
* Database optimization in production
* Identifying N+1 query problems
* Monitoring query patterns over time

The theory is to point to one avenue of performance improvement, by reducing the performance cost of database queries.

This package supports analyzing the execution time of queries executed on SQLITE3 on Node.js.

It creates a log of each database query, and the number of milliseconds required to execute the query.  The package also includes a CLI tool for analyzing this log to show the average execution time of each query over the course of running your application.

Key feature: Zero-config profiling - Drop-in solution for existing SQLite apps

# INSTALLATION

```shell
$ npm install sqlite3-query-log --save
```

This package is meant to be integrated into a Node.js application which uses SQLITE3, specifically via the `node-sqlite3` driver.  Hence, it must be added as a dependency.

# INTEGRATION

The package exports a simple function, which you can use this way:

```js
import { Database } from 'sqlite3';
import { default as SQ3QueryLog } from 'sqlite3-query-log';

const dburl = typeof process.env.SQ3_DB_URL === 'string'
        ? process.env.SQ3_DB_URL
        : ':memory:';

export const sqdb = await Database.open(dburl);
// ...
if (typeof process.env.SQ3_PROFILE === 'string') {
    SQ3QueryLog(sqdb, process.env.SQ3_PROFILE);
}
```

This code is directly copied out of my application, [AkashaCMS](https://akashacms.com).  It uses SQLITE3 as an in-memory database, because it doesn't make sense to save its database to disk.

The model here is to set environment variables to configure these two parameters: 1) database URL, 2) where to save SQLITE3 query data.

There's nothing mysterious under the hood.  It simply calls this method on the Database object:

```js
db.on('profile', (sql, time) => {
    fs.writeFileSync(logfn,
        `${Base64.encode(sql)}\t${time}\n`,
        { flag: "a+" }
    );
});
```

This tells you:

1. The output format is tab-separated, with field 1 being the BASE64-encoded SQL, and field 2 being the time (in miliseconds) it took to execute that SQL command.
2. The output is written in append mode.

Because the log is written in append mode, you can `tail -f sql-log.txt` and see that indeed your application is running.

This output format was chosen for simplicity and speed of writing the log.  BASE64 encoding does not use TAB characters, ensuring the SQL field will not lead to an inability to decode the log.

You might prefer to, instead of using environment variables, to use command-line arguments, or a configuration file, to set these configuration parameters.  That's up to you and how you prefer to write applications.

# REPORTING

The package includes a CLI tool for analyzing log files:

```shell
$ npx sqlite3-query-log --help
Usage: sqlite3-query-log [options] [command]

Options:
  -V, --version                 output the version number
  -h, --help                    display help for command

Commands:
  decode [options] <logfn>      Decode the SQL strings, converting to JSON
  analyze [options] <jsonfile>
  help [command]                display help for command
```

You start by running your application like so:

```shell
$ SQ3_PROFILE=sql-2026-09-08-19-00.txt npx your-application-name --option 1 --option2 pizza
```

In other words, run your application, informing it to enable the SQL profiling.  When you're done, the file `sql-2026-09-08-19-00.txt` will have a log.

Next, you must decode the BASE64-encoded SQL strings:

```shell
$ npx sqlite3-query-log decode sql-2026-09-08-19-00.txt --output sql-2026-09-08-19-00.json
```

This decodes the SQL, and also converts the log into a JSON file.

Next, you can use the analyze command to produce a report of SQL execution time:

```shell
$ npx sqlite3-query-log analyze sql-2026-09-08-19-00.json \
        --output sql-2026-09-08-19-00-report.txt
```

This step coalesces multiple exeuctions of the same SQL statement, computing the total execution time, the number of times the statement was executed, and the average execution time.

An optional parameter, `--threshold <ms>`, lets you ignore reports which show less execution time than the threshold.  With a threshold of `1`, the first of the example reports would not be printed.

Examples from analysis of a real application:

```
        INSERT INTO 'ASSETS'
        (
            vpath,
            mime,
            mounted,
            mountPoint,
            pathInMounted,
            fspath,
            dirname,
            mtimeMs,
            info
        )
        VALUES
        (
            $vpath,
            $mime,
            $mounted,
            $mountPoint,
            $pathInMounted,
            $fspath,
            $dirname,
            $mtimeMs,
            $info
        );
        
96      3909    0.024558710667689946
```

This INSERT statement was executed 96 times, for a total of 3909 miliseconds, which computes to the average shown here.

```
        SELECT *
        FROM 'DOCUMENTS'
        WHERE 
        vpath = $vpath OR renderPath = $vpath
        
18432   10324   1.7853545137543587
```

For some reason this statement takes awhile.  There are indexes on both of these columns, as well as an index for both together.

```
        SELECT DISTINCT d.* FROM 'DOCUMENTS' d
        WHERE d.rendersToHTML = $param1
            AND d.blogtag = $param2
            AND d.layout IN ($param3, $param4, $param5)
        ORDER BY COALESCE(
                d.publicationTime,
                d.mtimeMs
            ) DESC

506     6       84.33333333333333
```

This one is something to look into more carefully.

# Intention meets reality

The intent was to support this tool against all SQLITE3 drivers for Node.js.  Unfortunately, only the traditional `node-sqlite3` package has the necessary API to retrieve performance traces.  While the intent was to support `better-sqlite3`, `node:sqlite3` and `bun:sqlite3`, none of those drivers have a `db.on('profile')` hook.
