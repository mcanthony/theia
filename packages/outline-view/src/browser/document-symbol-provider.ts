/*
* Copyright (C) 2017 TypeFox and others.
*
* Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
* You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
*/

import { DocumentSymbolProvider, DocumentSymbolParams, CancellationToken, SymbolInformation } from "@theia/languages/lib/browser";

export class FileSymbolProvider implements DocumentSymbolProvider {
    provideDocumentSymbols(params: DocumentSymbolParams, token: CancellationToken): Promise<SymbolInformation[]> {
        const testData: SymbolInformation[] = [
            {
                name: 'foo',
                kind: 5,
                location: {
                    uri: '',
                    range: {
                        start: {
                            line: 1,
                            character: 1
                        },
                        end: {
                            line: 32,
                            character: 16
                        }
                    }
                }
            },
            {
                name: 'bar',
                kind: 6,
                location: {
                    uri: '',
                    range: {
                        start: {
                            line: 3,
                            character: 4
                        },
                        end: {
                            line: 12,
                            character: 16
                        }
                    }
                }
            },
            {
                name: 'baz',
                kind: 6,
                location: {
                    uri: '',
                    range: {
                        start: {
                            line: 14,
                            character: 4
                        },
                        end: {
                            line: 28,
                            character: 16
                        }
                    }
                }
            },
            {
                name: 'bar',
                kind: 14,
                containerName: 'bar',
                location: {
                    uri: '',
                    range: {
                        start: {
                            line: 4,
                            character: 8
                        },
                        end: {
                            line: 4,
                            character: 16
                        }
                    }
                }
            }
        ];

        return Promise.resolve(testData);
    }
}