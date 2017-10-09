/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as temp from 'temp';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as assert from 'assert';
import { ExtensionClient, ExtensionServer, Extension } from '../common/extension-protocol';
import extensionNodeTestContainer from './test/extension-node-test-container';
import { ApplicationProject } from './application-project';

process.on('unhandledRejection', (reason, promise) => {
    console.error(reason);
    throw reason;
});

let appProjectPath: string;
let appProject: ApplicationProject;
let server: ExtensionServer;

export function waitForDidChange(): Promise<void> {
    return new Promise(resolve => {
        server.setClient(<ExtensionClient>{
            onDidChange: change => resolve()
        });
    });
}

const dir = path.resolve(__dirname, '..', '..', 'node-extension-server-test-temp');
fs.ensureDirSync(dir);

describe("node-extension-server", function () {

    beforeEach(function () {
        this.timeout(50000);
        appProjectPath = temp.mkdirSync({ dir });
        fs.writeJsonSync(path.resolve(appProjectPath, 'package.json'), {
            "dependencies": {
                "@theia/core": "0.1.0",
                "@theia/extension-manager": "0.1.0"
            }
        });

        const container = extensionNodeTestContainer({
            projectPath: appProjectPath,
            target: 'browser',
            npmClient: 'yarn',
            autoInstall: false
        });
        server = container.get(ExtensionServer);
        appProject = container.get(ApplicationProject);
    });

    afterEach(function () {
        this.timeout(50000);
        server.dispose();
        appProject.dispose();
        fs.removeSync(appProjectPath);
    });

    it("search", function () {
        this.timeout(30000);

        return server.search({
            query: "filesystem scope:theia"
        }).then(extensions => {
            assert.equal(extensions.length, 1, JSON.stringify(extensions, undefined, 2));
            assert.equal(extensions[0].name, '@theia/filesystem');
        });
    });

    it("installed", function () {
        this.timeout(10000);

        return server.installed().then(extensions => {
            assert.equal(true, extensions.length >= 3, JSON.stringify(extensions, undefined, 2));
            assert.equal(true, extensions.some(e => e.name === '@theia/core'), JSON.stringify(before, undefined, 2));
            assert.equal(true, extensions.some(e => e.name === '@theia/filesystem'), JSON.stringify(before, undefined, 2));
            assert.equal(true, extensions.some(e => e.name === '@theia/extension-manager'), JSON.stringify(before, undefined, 2));
        });
    });

    it("install", async function () {
        this.timeout(10000);

        const before = await server.installed();
        assert.equal(false, before.some(e => e.name === '@theia/editor'), JSON.stringify(before, undefined, 2));

        const onDidChangePackage = waitForDidChange();

        await server.install("@theia/editor");

        await onDidChangePackage;
        return server.installed().then(after => {
            assert.equal(true, after.some(e => e.name === '@theia/editor'), JSON.stringify(after, undefined, 2));
        });
    });

    it("uninstall", async function () {
        this.timeout(10000);

        const before = await server.installed();
        assert.equal(true, before.some(e => e.name === '@theia/extension-manager'), JSON.stringify(before, undefined, 2));

        const onDidChangePackage = waitForDidChange();

        await server.uninstall("@theia/extension-manager");

        await onDidChangePackage;
        return server.installed().then(after => {
            assert.equal(false, after.some(e => e.name === '@theia/extension-manager'), JSON.stringify(after, undefined, 2));
        });
    });

    it("outdated", function () {
        this.timeout(10000);

        return server.outdated().then(extensions => {
            assert.equal(extensions.length, 1, JSON.stringify(extensions, undefined, 2));
            assert.equal(extensions[0].name, '@theia/core');
        });
    });

    it("update", async function () {
        this.timeout(10000);

        const before = await server.outdated();
        assert.equal(true, before.some(e => e.name === '@theia/core'), JSON.stringify(before, undefined, 2));

        const onDidChangePackage = waitForDidChange();

        await server.update("@theia/core");

        await onDidChangePackage;
        return server.outdated().then(after => {
            assert.equal(false, after.some(e => e.name === '@theia/core'), JSON.stringify(after, undefined, 2));
        });
    });

    it("list", function () {
        this.timeout(10000);

        return server.list().then(extensions => {
            assertExtension({
                name: '@theia/core',
                installed: true,
                outdated: true
            }, extensions);

            assertExtension({
                name: '@theia/extension-manager',
                installed: true,
                outdated: false
            }, extensions);
        });
    });

    it("list with search", function () {
        this.timeout(30000);

        return server.list({
            query: "scope:theia"
        }).then(extensions => {
            const filtered = extensions.filter(e => ['@theia/core', '@theia/editor'].indexOf(e.name) !== -1);

            assertExtension({
                name: '@theia/core',
                installed: true,
                outdated: true
            }, filtered);

            assertExtension({
                name: '@theia/editor',
                installed: false,
                outdated: false
            }, filtered);
        });
    });

});

function assertExtension(expectation: {
    name: string
    installed: boolean
    outdated: boolean
}, extensions: Extension[]): void {
    const extension = extensions.find(e => e.name === expectation.name);
    assert.deepEqual(false, !extension, JSON.stringify(extensions, undefined, 2));
    assert.deepEqual(expectation, Object.assign({}, {
        name: extension!.name,
        installed: extension!.installed,
        outdated: extension!.outdated
    }), JSON.stringify(extensions, undefined, 2));
}
