/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable } from "inversify";
import { OutlineViewManager } from './outline-view-manager';
import { Tree, ICompositeTreeNode, ITreeNode, ISelectableTreeNode } from "@theia/core/lib/browser";
import { UriSelection } from "@theia/filesystem/lib/common";
import { Range } from '@theia/editor/lib/browser';
import SymbolInformation = monaco.modes.SymbolInformation;
import URI from "@theia/core/lib/common/uri";

@injectable()
export class OutlineViewTree extends Tree {
    constructor(
        protected readonly outlineViewManager: OutlineViewManager
    ) {
        super();

        outlineViewManager.onDidChangeOutline(symbolInformation => {
            this.refresh();
        });

        this.root = <ICompositeTreeNode>{
            visible: false,
            id: 'theia-outline-view-widget',
            name: 'OutlineView',
            children: [],
            parent: undefined
        };
    }

    public resolveChildren(parent: ICompositeTreeNode): Promise<ITreeNode[]> {
        if (ICompositeTreeNode.is(parent)) {
            return this.getSymbolInformationNode(parent);
        }
        return super.resolveChildren(parent);
    }

    addChildren(symbolInformationNodes: SymbolInformationNode[], container: string) {
        const containerChildren = symbolInformationNodes.filter(sym => sym.containerName === container);

    }

    getSymbolInformationNode(parent: ICompositeTreeNode): Promise<SymbolInformationNode[]> {
        const symbolInformationList: SymbolInformation[] = this.outlineViewManager.getSymbolInformation();
        const symbolInformationNodes: SymbolInformationNode[] = [];
        symbolInformationList.forEach(symbolInformation => {
            const range: Range = {
                end: {
                    character: symbolInformation.location.range.endColumn,
                    line: symbolInformation.location.range.endLineNumber
                },
                start: {
                    character: symbolInformation.location.range.startColumn,
                    line: symbolInformation.location.range.startLineNumber
                }
            };
            const containerName: string = symbolInformation.containerName || "";
            const name: string = symbolInformation.name;
            symbolInformationNodes.push({
                children: [],
                containerName,
                range,
                id: symbolInformation.name + "-" + range.start.line + "-" + range.start.character + "-" + range.end.line + "-" + range.start.character,
                kind: symbolInformation.kind,
                name,
                parent,
                selected: false,
                uri: new URI(symbolInformation.location.uri.toString())
            });
        });

        return Promise.resolve(symbolInformationNodes);
    }
}

export interface SymbolInformationNode extends ICompositeTreeNode, UriSelection, ISelectableTreeNode {
    containerName: string;
    kind: number;
    range: Range
}

export namespace SymbolInformationNode {
    export function is(node: ITreeNode): node is SymbolInformationNode {
        return UriSelection.is(node) && ISelectableTreeNode.is(node) && 'containerName' in node;
    }
}
