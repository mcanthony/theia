/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as os from 'os';
import * as fs from 'fs-extra';
import { Model } from "./generator-model";

export abstract class AbstractGenerator {

    constructor(
        protected readonly model: Model
    ) { }

    protected compileFrontendModuleImports(modules: Map<string, string>): string {
        return this.compileModuleImports(modules, 'require');
    }

    protected compileBackendModuleImports(modules: Map<string, string>): string {
        return this.compileModuleImports(modules, 'require');
    }

    protected compileModuleImports(modules: Map<string, string>, fn: 'import' | 'require'): string {
        if (modules.size === 0) {
            return '';
        }
        const lines = Array.from(modules.keys()).map(moduleName => {
            const invocation = `${fn}('${modules.get(moduleName)}')`;
            if (fn === 'require') {
                return `Promise.resolve(${invocation})`;
            }
            return invocation;
        }).map(statement => `    .then(function () { return ${statement}.then(load) })`);
        return os.EOL + lines.join(os.EOL);
    }

    protected ifBrowser(value: string, defaultValue: string = '') {
        return this.model.ifBrowser(value, defaultValue);
    }

    protected ifElectron(value: string, defaultValue: string = '') {
        return this.model.ifElectron(value, defaultValue);
    }

    protected write(path: string, content: string): void {
        fs.ensureFileSync(path);
        fs.writeFileSync(path, content);
    }

}
