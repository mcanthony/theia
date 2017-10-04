/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable, inject } from "inversify";
import { Event, Emitter } from "@theia/core";
import { EditorManager, EditorWidget } from "@theia/editor/lib/browser";
import { MonacoTextModelService } from "@theia/monaco/lib/browser/monaco-text-model-service";
import DocumentSymbolProviderRegistry = monaco.modes.DocumentSymbolProviderRegistry;
import SymbolInformation = monaco.modes.SymbolInformation;
import CancellationTokenSource = monaco.cancellation.CancellationTokenSource;

@injectable()
export class OutlineViewManager {

    protected readonly onDidChangeOutlineEmitter = new Emitter<void>();
    protected symbolInformation: SymbolInformation[] = [];

    constructor(
        @inject(EditorManager) protected editorManager: EditorManager,
        @inject(MonacoTextModelService) protected readonly textModelService: MonacoTextModelService
    ) {
        editorManager.onCurrentEditorChanged(async (editor: EditorWidget) => {

            const entries: SymbolInformation[] = [];

            const reference = await textModelService.createModelReference(editor.editor.uri);
            const model = reference.object.textEditorModel;
            const documentSymbolProviders = await DocumentSymbolProviderRegistry.all(model);

            for (const documentSymbolProvider of documentSymbolProviders) {
                const cancellationSource = new CancellationTokenSource();
                const symbolInformation = await documentSymbolProvider.provideDocumentSymbols(model, cancellationSource.token);
                entries.push(...symbolInformation);
            }

            this.symbolInformation = entries;

            this.fireOnDidChangeOutline();
        });
    }

    get onDidChangeOutline(): Event<void> {
        return this.onDidChangeOutlineEmitter.event;
    }

    getSymbolInformation(): SymbolInformation[] {
        return this.symbolInformation;
    }

    protected fireOnDidChangeOutline(): void {
        this.onDidChangeOutlineEmitter.fire(undefined);
    }
}