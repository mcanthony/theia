/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { injectable } from "inversify";
import { OutlineViewManager } from './outline-view-manager';
import { Tree, ICompositeTreeNode, ITreeNode } from "@theia/core/lib/browser";

@injectable()
export class OutlineViewTree extends Tree {
    constructor(
        protected readonly outlineViewManager: OutlineViewManager
    ) {
        super();

        outlineViewManager.onDidChangeOutline(() => {
            this.refresh();
        });

        this.root = <ICompositeTreeNode>{
            visible: true,
            id: 'theia-outline-view-widget',
            name: 'OutlineView',
            children: [],
            parent: undefined
        };

    }

    resolveChildren(parent: ICompositeTreeNode): Promise<ITreeNode[]> {

        return super.resolveChildren(parent);
    }
}
