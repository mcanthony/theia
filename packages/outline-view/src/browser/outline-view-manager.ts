/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable, inject } from "inversify";
import { FileChange } from "@theia/filesystem/lib/common";
import { Event, Emitter } from "@theia/core";
import { EditorManager, EditorWidget } from "@theia/editor/lib/browser";

@injectable()
export class OutlineViewManager {

    protected readonly onDidChangeOutlineEmitter = new Emitter<FileChange[]>();

    constructor(
        @inject(EditorManager) protected editorManager: EditorManager
    ) {
        editorManager.onCurrentEditorChanged((editor: EditorWidget) => {
            editor.editor.document
            // this.fireOnDidChangeOutline();
        });
    }

    get onDidChangeOutline(): Event<FileChange[]> {
        return this.onDidChangeOutlineEmitter.event;
    }

    protected fireOnDidChangeOutline(changes: FileChange[]): void {
        this.onDidChangeOutlineEmitter.fire(changes);
    }
}