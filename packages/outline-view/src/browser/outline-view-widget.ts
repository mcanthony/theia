/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable, inject } from 'inversify';
import { SymbolInformationNode } from './outline-view-tree';
import {
    TreeWidget,
    ITreeNode,
    NodeProps,
    ITreeModel,
    ISelectableTreeNode,
    TreeProps,
    TreeModel,
    ContextMenuRenderer
} from "@theia/core/lib/browser";
import { h } from "@phosphor/virtualdom/lib";
import SymbolInformation = monaco.modes.SymbolInformation;
import { Message } from '@phosphor/messaging';

@injectable()
export class OutlineViewWidget extends TreeWidget {

    protected symbolInformation: SymbolInformation[];

    constructor(
        @inject(TreeProps) protected readonly treeProps: TreeProps,
        @inject(TreeModel) readonly model: TreeModel,
        @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer
    ) {
        super(treeProps, model, contextMenuRenderer);

        this.id = 'outline-view';
        this.title.label = 'Outline';
        this.addClass('theia-outline-view');
    }

    protected onUpdateRequest(msg: Message): void {
        if (!this.model.selectedNode && ISelectableTreeNode.is(this.model.root)) {
            this.model.selectNode(this.model.root);
        }
        super.onUpdateRequest(msg);
    }

    protected renderTree(model: ITreeModel): h.Child {
        return super.renderTree(model);
    }

    protected decorateCaption(node: ITreeNode, caption: h.Child, props: NodeProps): h.Child {
        if (SymbolInformationNode.is(node)) {
            return h.div({}, node.name + " has children: " + node.children.length);
        } else {
            return "";
        }
    }
}
