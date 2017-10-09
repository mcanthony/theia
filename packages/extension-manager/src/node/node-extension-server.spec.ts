/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import * as assert from 'assert';
import { ExtensionClient, ExtensionServer } from '../common/extension-protocol';
import extensionNodeTestContainer from './test/extension-node-test-container';
import { ApplicationProject } from './application-project';

process.on('unhandledRejection', (reason, promise) => {
    throw reason;
});

let appProject: ApplicationProject;
let server: ExtensionServer;
const testProjectPath = path.resolve(__dirname, '..', '..', 'test-resources', 'testproject');
const appProjectPath = path.resolve(__dirname, '..', '..', 'test-resources', 'testproject_temp');

export function waitForDidChange(): Promise<void> {
    return new Promise(resolve => {
        server.setClient(<ExtensionClient>{
            onDidChange: () => resolve()
        });
    });
}

describe("node-extension-server", function () {

    beforeEach(function () {
        this.timeout(50000);
        fs.removeSync(appProjectPath);
        fs.copySync(testProjectPath, appProjectPath);
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
            assert.equal(extensions.length, 2, JSON.stringify(extensions, undefined, 2));
            assert.deepEqual(['@theia/core', '@theia/extension-manager'], extensions.map(e => e.name));
        });
    });

    it("install", async function () {
        this.timeout(10000);

        const before = await server.installed();
        assert.equal(false, before.some(e => e.name === '@theia/filesystem'), JSON.stringify(before, undefined, 2));

        const onDidChangePackage = waitForDidChange();

        await server.install("@theia/filesystem");

        await onDidChangePackage;
        return server.installed().then(after => {
            assert.equal(true, after.some(e => e.name === '@theia/filesystem'), JSON.stringify(after, undefined, 2));
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
            assert.equal(extensions.length, 2, JSON.stringify(extensions, undefined, 2));

            assert.deepEqual([
                {
                    name: '@theia/core',
                    installed: true,
                    outdated: true
                },
                {
                    name: '@theia/extension-manager',
                    installed: true,
                    outdated: false
                }
            ], extensions.map(e =>
                Object.assign({}, {
                    name: e.name,
                    installed: e.installed,
                    outdated: e.outdated
                })
            ));
        });
    });

    it("list with search", function () {
        this.timeout(30000);

        return server.list({
            query: "scope:theia"
        }).then(extensions => {
            const filtered = extensions.filter(e => ['@theia/core', '@theia/filesystem'].indexOf(e.name) !== -1);
            assert.equal(filtered.length, 2, JSON.stringify(filtered, undefined, 2));

            assert.deepEqual([
                {
                    name: '@theia/core',
                    installed: true,
                    outdated: true
                },
                {
                    name: '@theia/filesystem',
                    installed: false,
                    outdated: false
                }
            ], filtered.map(e =>
                Object.assign({}, {
                    name: e.name,
                    installed: e.installed,
                    outdated: e.outdated
                })
            ));
        });
    });

});
