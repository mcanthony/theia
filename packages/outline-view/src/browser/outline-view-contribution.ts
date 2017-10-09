/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import { FrontendApplicationContribution, FrontendApplication } from "@theia/core/lib/browser";
import { StorageService } from '@theia/core/lib/browser/storage-service';
import { WidgetFactory, WidgetManager } from '@theia/core/lib/browser/widget-manager';
import { Widget } from '@phosphor/widgets';
import { OutlineViewWidget } from "./outline-view-widget";

@injectable()
export class OutlineViewContribution implements FrontendApplicationContribution, WidgetFactory {

    id = 'outline-view';

    constructor(
        @inject(OutlineViewWidget) protected readonly outlineViewWidget: OutlineViewWidget,
        @inject(WidgetManager) protected readonly widgetManager: WidgetManager,
        @inject(StorageService) protected storageService: StorageService
    ) { }

    onStart(app: FrontendApplication): void {
        this.widgetManager.getOrCreateWidget('outline-view').then(outline => {
            app.shell.addToRightArea(outline);
        });
    }

    async createWidget(): Promise<Widget> {
        return this.outlineViewWidget;
    }
}
