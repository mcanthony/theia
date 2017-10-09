/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { injectable, inject } from "inversify";
import URI from "@theia/core/lib/common/uri";
import { FileSystem, FileStat, FileSystemWatcher } from "@theia/filesystem/lib/common";
import { WorkspaceServer } from "../common";

/**
 * The workspace service.
 */
@injectable()
export class WorkspaceService {

    constructor(
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(FileSystemWatcher) protected readonly watcher: FileSystemWatcher,
        @inject(WorkspaceServer) protected readonly server: WorkspaceServer
    ) { }

    /**
     * The promise which will resolve to the currently selected workspace root.
     * This promise resolves to the workspace root file stat, if [rootResolved](WorkspaceService.rootResolved) is `true`.
     */
    get root(): Promise<FileStat> {
        const self = this;
        return new Promise((resolve, reject) => {
            (function waitUntilResolved() {
                self.server.getRoot().then(uri => {
                    if (uri) {
                        self.validateRoot(uri).then(
                            root => resolve(root),
                            () => setTimeout(waitUntilResolved, 200)
                        );
                    }
                    setTimeout(waitUntilResolved, 200);
                });
            })();
        });
    }

    /**
     * `true` if the workspace root is set, hence it is available and can be used by clients.
     */
    get rootResolved(): Promise<boolean> {
        return this.server.getRoot().then(uri => !!uri);
    }

    /**
     * Returns a promise resolving to the default workspace root location. This method should be used if [resolvedRoot](WorkspaceService.rootResolved) is `false`.
     */
    get defaultRoot(): Promise<FileStat> {
        return new Promise((resolve, reject) => {
            this.server.getDefaultRoot().then(uri => resolve(this.validateRoot(uri)));
        });
    }

    /**
     * Opens the given URI as the current workspace root.
     */
    open(uri: URI, options?: WorkspaceInput): void {
        this.validateRoot(uri.toString())
            .then(fileStat => this.server.setRoot(fileStat.uri))
            .then(() => this.openWindow(uri, options));
    }

    protected async validateRoot(uri: string): Promise<FileStat> {
        try {
            const fileStat = await this.fileSystem.getFileStat(uri);
            if (!fileStat.isDirectory) {
                throw new Error(`Expected a URI pointing to a directory. Was: ${uri}.`);
            }
            return fileStat;
        } catch (error) {
            throw error;
        }
    }

    protected openWindow(uri: URI, options?: WorkspaceInput): void {
        this.rootResolved.then(resolved => {
            // The same window has to be preserved too (instead of opening a new one), if the workspace root is being set at the first time.
            if (this.shouldPreserveWindow(options) || !resolved) {
                this.reloadWindow();
            } else {
                this.openNewWindow();
            }
        });
    }

    protected reloadWindow(): void {
        window.location.reload();
    }

    protected openNewWindow(): void {
        window.open(window.location.href);
    }

    protected shouldPreserveWindow(options?: WorkspaceInput): boolean {
        return options !== undefined && !!options.preserveWindow;
    }

}

export interface WorkspaceInput {
    /**
     * Tests whether the same window should be used. By default it is `false`.
     */
    preserveWindow?: boolean;
}
