/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable } from "inversify";
import { OutlineViewManager } from './outline-view-manager';
import { Tree, ICompositeTreeNode, ITreeNode, ISelectableTreeNode, IExpandableTreeNode } from "@theia/core/lib/browser";
import { UriSelection } from "@theia/filesystem/lib/common";
import { Range } from '@theia/editor/lib/browser';
import SymbolInformation = monaco.modes.SymbolInformation;
import SymbolKind = monaco.modes.SymbolKind;
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

    convertToNode(symbolInformation: SymbolInformation, parent: ICompositeTreeNode): SymbolInformationNode {
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
        const node: SymbolInformationNode = {
            children: [],
            containerName: symbolInformation.containerName,
            range,
            id: symbolInformation.name + "-" + range.start.line + "-" + range.start.character + "-" + range.end.line + "-" + range.start.character,
            kind: SymbolKind[symbolInformation.kind].toLowerCase(),
            name: symbolInformation.name,
            parent,
            selected: false,
            expanded: false,
            uri: new URI(symbolInformation.location.uri.toString())
        };
        return node;
    }

    setChildNodes(node: ICompositeTreeNode, symbolInformationList: SymbolInformation[]): SymbolInformationNode[] {
        const childNodes: SymbolInformationNode[] =
            symbolInformationList
                .filter(sym => {
                    if (SymbolInformationNode.is(node)) {
                        const symRange = sym.location.range;
                        const nodeRange = node.range;
                        const nodeIsContainer = sym.containerName === node.name;
                        const sameStartLine = symRange.startLineNumber === nodeRange.start.line;
                        const startColGreater = symRange.startColumn > nodeRange.start.character;
                        const startLineGreater = symRange.startLineNumber > nodeRange.start.line;
                        const sameEndLine = symRange.endLineNumber === nodeRange.end.line;
                        const endColSmaller = symRange.endColumn < nodeRange.end.character;
                        const endLineSmaller = symRange.endLineNumber < nodeRange.end.line;
                        return nodeIsContainer &&
                            ((sameStartLine && startColGreater) || (startLineGreater)) &&
                            ((sameEndLine && endColSmaller) || (endLineSmaller));
                    } else {
                        return !sym.containerName;
                    }
                })
                .map(sym => this.convertToNode(sym, node));
        childNodes.forEach(childNode => childNode.children = this.setChildNodes(childNode, symbolInformationList));
        return childNodes;
    }

    getSymbolInformationNode(parent: ICompositeTreeNode): Promise<SymbolInformationNode[]> {
        const symbolInformationList: SymbolInformation[] = this.outlineViewManager.getSymbolInformation();
        return Promise.resolve(this.setChildNodes(parent, symbolInformationList));
    }
}

export interface SymbolInformationNode extends ICompositeTreeNode, UriSelection, ISelectableTreeNode, IExpandableTreeNode {
    containerName: string | undefined;
    kind: string;
    range: Range
}

export namespace SymbolInformationNode {
    export function is(node: ITreeNode): node is SymbolInformationNode {
        return UriSelection.is(node) && ISelectableTreeNode.is(node) && 'containerName' in node;
    }
}
