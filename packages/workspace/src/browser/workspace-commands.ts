/*
 * Copyright (C) 2017 TypeFox and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */

import { inject, injectable } from 'inversify';
import URI from "@theia/core/lib/common/uri";
import { SelectionService } from '@theia/core/lib/common';
import { Command, CommandContribution, CommandHandler, CommandRegistry } from '@theia/core/lib/common/command';
import { MAIN_MENU_BAR, MenuContribution, MenuModelRegistry } from '@theia/core/lib/common/menu';
import { CommonCommands } from "@theia/core/lib/browser/common-frontend-contribution";
import { FileSystem, FileStat } from '@theia/filesystem/lib/common/filesystem';
import { UriSelection } from '@theia/filesystem/lib/common/filesystem-selection';
import { SingleTextInputDialog, ConfirmDialog } from "@theia/core/lib/browser/dialogs";
import { OpenerService, OpenHandler, open } from "@theia/core/lib/browser";
import { WorkspaceService } from './workspace-service';

export namespace WorkspaceCommands {
    export const NEW_FILE = 'file:newFile';
    export const NEW_FOLDER = 'file:newFolder';
    export const FILE_OPEN = 'file:open';
    export const FILE_OPEN_WITH = (opener: OpenHandler): Command => <Command>{
        id: `file:openWith:${opener.id}`,
        label: opener.label,
        iconClass: opener.iconClass
    };
    export const FILE_CUT = CommonCommands.CUT.id;
    export const FILE_COPY = CommonCommands.COPY.id;
    export const FILE_PASTE = CommonCommands.PASTE.id;
    export const FILE_RENAME = 'file:fileRename';
    export const FILE_DELETE = 'file:fileDelete';
}

export namespace FileMenus {
    export const FILE = [MAIN_MENU_BAR, "1_file"];
    export const NEW_GROUP = [...FILE, '1_new'];
    export const OPEN_GROUP = [...FILE, '2_open'];
}

@injectable()
export class FileMenuContribution implements MenuContribution {

    registerMenus(registry: MenuModelRegistry) {
        // Explicitly register the Edit Submenu
        registry.registerSubmenu([MAIN_MENU_BAR], FileMenus.FILE[1], "File");

        registry.registerMenuAction(FileMenus.NEW_GROUP, {
            commandId: WorkspaceCommands.NEW_FILE
        });
        registry.registerMenuAction(FileMenus.NEW_GROUP, {
            commandId: WorkspaceCommands.NEW_FOLDER
        });
    }
}

@injectable()
export class WorkspaceCommandContribution implements CommandContribution {
    constructor(
        @inject(FileSystem) protected readonly fileSystem: FileSystem,
        @inject(WorkspaceService) protected readonly workspaceService: WorkspaceService,
        @inject(SelectionService) protected readonly selectionService: SelectionService,
        @inject(OpenerService) protected readonly openerService: OpenerService
    ) { }

    registerCommands(registry: CommandRegistry): void {
        registry.registerCommand({
            id: WorkspaceCommands.NEW_FILE,
            label: 'New File'
        });
        registry.registerCommand({
            id: WorkspaceCommands.NEW_FOLDER,
            label: 'New Folder'
        });
        registry.registerCommand({
            id: WorkspaceCommands.FILE_OPEN,
            label: 'Open'
        });
        registry.registerCommand({
            id: WorkspaceCommands.FILE_RENAME,
            label: 'Rename'
        });
        registry.registerCommand({
            id: WorkspaceCommands.FILE_DELETE,
            label: 'Delete'
        });

        this.openerService.getOpeners().then(openers => {
            for (const opener of openers) {
                const openWithCommand = WorkspaceCommands.FILE_OPEN_WITH(opener);
                registry.registerCommand(openWithCommand, this.newFileHandler({
                    execute: uri => opener.open(uri),
                    isEnabled: uri => opener.canHandle(uri) !== 0,
                    isVisible: uri => opener.canHandle(uri) !== 0
                }));
            }
        });

        registry.registerHandler(WorkspaceCommands.FILE_RENAME, this.newFileHandler({
            execute: uri => this.getParent(uri).then(parent => {
                const dialog = new SingleTextInputDialog({
                    title: 'Rename File',
                    initialValue: uri.path.base,
                    validate: name => this.validateFileName(name, parent)
                });
                dialog.open().then(name =>
                    this.fileSystem.move(uri.toString(), uri.parent.resolve(name).toString())
                );
            })
        }));

        registry.registerHandler(WorkspaceCommands.NEW_FILE, this.newWorkspaceHandler({
            execute: uri => this.getDirectory(uri).then(parent => {
                const parentUri = new URI(parent.uri);
                const vacantChildUri = this.findVacantChildUri(parentUri, parent, 'Untitled', '.txt');
                const dialog = new SingleTextInputDialog({
                    title: `New File`,
                    initialValue: vacantChildUri.path.base,
                    validate: name => this.validateFileName(name, parent)
                });
                dialog.open().then(name => {
                    const fileUri = parentUri.resolve(name);
                    this.fileSystem.createFile(fileUri.toString()).then(() => {
                        open(this.openerService, fileUri);
                    });
                });
            })
        }));

        registry.registerHandler(WorkspaceCommands.NEW_FOLDER, this.newWorkspaceHandler({
            execute: uri => this.getDirectory(uri).then(parent => {
                const parentUri = new URI(parent.uri);
                const vacantChildUri = this.findVacantChildUri(parentUri, parent, 'Untitled');
                const dialog = new SingleTextInputDialog({
                    title: `New Folder`,
                    initialValue: vacantChildUri.path.base,
                    validate: name => this.validateFileName(name, parent)
                });
                dialog.open().then(name =>
                    this.fileSystem.createFolder(parentUri.resolve(name).toString())
                );
            })
        }));

        registry.registerHandler(WorkspaceCommands.FILE_DELETE, this.newFileHandler({
            execute: uri => {
                const dialog = new ConfirmDialog({
                    title: 'Delete File',
                    msg: `Do you really want to delete '${uri.path.base}'?`
                });
                return dialog.open().then(() => this.fileSystem.delete(uri.toString()));
            }
        }));

        registry.registerHandler(WorkspaceCommands.FILE_OPEN, this.newFileHandler({
            execute: uri => open(this.openerService, uri)
        }));
    }

    protected newFileHandler(handler: UriCommandHandler): FileSystemCommandHandler {
        return new FileSystemCommandHandler(this.selectionService, handler);
    }

    protected newWorkspaceHandler(handler: UriCommandHandler): WorkspaceRootAwareCommandHandler {
        return new WorkspaceRootAwareCommandHandler(this.workspaceService, this.selectionService, handler);
    }

    /**
     * returns an error message or an empty string if the file name is valid
     * @param name the simple file name to validate
     * @param parent the parent directory's file stat
     */
    protected validateFileName(name: string, parent: FileStat): string {
        if (!name || !name.match(/^[\w\-. ]+$/)) {
            return "Invalid name, try other";
        }
        if (parent.children) {
            for (const child of parent.children) {
                if (new URI(child.uri).path.base === name) {
                    return 'A file with this name already exists.';
                }
            }
        }
        return '';
    }

    protected async getDirectory(candidate: URI): Promise<FileStat> {
        const stat = await this.fileSystem.getFileStat(candidate.toString());
        if (stat.isDirectory) {
            return stat;
        }
        return this.getParent(candidate);
    }

    protected getParent(candidate: URI): Promise<FileStat> {
        return this.fileSystem.getFileStat(candidate.parent.toString());
    }

    protected findVacantChildUri(parentUri: URI, parent: FileStat, name: string, ext: string = ''): URI {
        const children = !parent.children ? [] : parent.children!.map(child => new URI(child.uri));

        let index = 1;
        let base = name + ext;
        while (children.some(child => child.path.base === base)) {
            index = index + 1;
            base = name + '_' + index + ext;
        }
        return parentUri.resolve(base);
    }
}

export interface UriCommandHandler {
    execute(uri: URI, ...args: any[]): any;
    isEnabled?(uri: URI, ...args: any[]): boolean;
    isVisible?(uri: URI, ...args: any[]): boolean;
}
export class FileSystemCommandHandler implements CommandHandler {
    constructor(
        protected readonly selectionService: SelectionService,
        protected readonly handler: UriCommandHandler
    ) { }

    protected getUri(): URI | undefined {
        return UriSelection.getUri(this.selectionService.selection);
    }

    execute(...args: any[]): object | undefined {
        const uri = this.getUri();
        return uri ? this.handler.execute(uri, ...args) : undefined;
    }

    isVisible(...args: any[]): boolean {
        const uri = this.getUri();
        if (uri) {
            if (this.handler.isVisible) {
                return this.handler.isVisible(uri, ...args);
            }
            return true;
        }
        return false;
    }

    isEnabled(...args: any[]): boolean {
        const uri = this.getUri();
        if (uri) {
            if (this.handler.isEnabled) {
                return this.handler.isEnabled(uri, ...args);
            }
            return true;
        }
        return false;
    }

}

export class WorkspaceRootAwareCommandHandler extends FileSystemCommandHandler {

    protected rootUri: URI;

    constructor(
        protected readonly workspaceService: WorkspaceService,
        protected readonly selectionService: SelectionService,
        protected readonly handler: UriCommandHandler
    ) {
        super(selectionService, handler);
        workspaceService.root.then(root => {
            this.rootUri = new URI(root.uri)
        });
    }
    protected getUri(): URI | undefined {
        return UriSelection.getUri(this.selectionService.selection) || this.rootUri;
    }
}