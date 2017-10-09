/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
import * as http from 'http';
import * as cluster from 'cluster';
import { MasterProcess } from './master-process';

process.on('unhandledRejection', (reason, promise) => {
    throw reason;
});

const args = require('yargs').argv;
const noCluster = args['cluster'] === false;
const isMaster = !noCluster && cluster.isMaster;
const development = process.env.NODE_ENV === "development";

if (isMaster && development) {
    // https://github.com/Microsoft/vscode/issues/3201
    process.execArgv = process.execArgv.reduce((result, arg) => {
        result.push(arg.replace('-brk', ''));
        return result;
    }, [] as string[]);
}

export interface Address {
    port: number;
    address: string;
}

export async function start(serverPath: string): Promise<Address> {
    if (isMaster) {
        const process = new MasterProcess();
        return process.start().listening;
    }
    const { port, hostname } = args;
    console.info("Starting express on port '" + port + "'.");
    if (hostname) {
        console.info("Allowed host is '" + hostname + "'.");
    }
    const server: http.Server = await require(serverPath)(port, hostname);
    return server.address();
}
export default start;
