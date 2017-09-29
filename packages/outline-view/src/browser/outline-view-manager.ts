/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable, inject } from "inversify";
import { FileSystemWatcher } from "@theia/filesystem/lib/common";
import { Event, Emitter } from "@theia/core";

@injectable()
export class OutlineViewManager {

    protected readonly onDidChangeOutlineEmitter = new Emitter<void>();

    constructor(
        @inject(FileSystemWatcher) protected fileWatcher?: FileSystemWatcher
    ) {
        if (fileWatcher) {
            fileWatcher.onFilesChanged(changes => {
                this.fireOnDidChangeOutline();
            });
        }
    }

    get onDidChangeOutline(): Event<void> {
        return this.onDidChangeOutlineEmitter.event;
    }

    protected fireOnDidChangeOutline(): void {
        this.onDidChangeOutlineEmitter.fire(undefined);
    }
}