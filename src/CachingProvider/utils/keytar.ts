/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as keytarModule from 'keytar';

/**
 * Interface for Keytar
 * @internal
 */
export interface Keytar {
    /**
     * Gets a secret from secure Keytar storage
     * @param service The service to get the secret for
     * @param account The account to get the secret for
     */
    getPassword(service: string, account: string): Promise<string | undefined>;

    /**
     * Sets a secret in secure Keytar storage
     * @param service The service to set the secret for
     * @param account The account to set the secret for
     * @param password The secret
     */
    setPassword(service: string, account: string, password: string): Promise<void>;

    /**
     * Deletes a secret from secure Keytar storage
     * @param service The service to delete the secret for
     * @param account The account to delete the secret for
     */
    deletePassword(service: string, account: string): Promise<boolean>;
}

// Use VSCode's built-in keytar: https://code.visualstudio.com/api/advanced-topics/remote-extensions#persisting-secrets
function getKeytarModule(): typeof keytarModule | undefined {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${require('vscode').env.appRoot}/node_modules.asar/keytar`);
    } catch (err) {
        // Not in ASAR.
    }

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        return require(`${require('vscode').env.appRoot}/node_modules/keytar`);
    } catch (err) {
        // Not available.
    }

    return undefined;
}

class KeytarClass implements Keytar {
    private readonly keytarModule: typeof keytarModule | undefined;

    public constructor() {
        this.keytarModule = getKeytarModule();
    }

    public async getPassword(service: string, account: string): Promise<string | undefined> {
        if (!this.keytarModule) {
            throw new Error('Unable to use keytar.');
        }

        return (await this.keytarModule.getPassword(service, account)) ?? undefined;
    }

    public setPassword(service: string, account: string, password: string): Promise<void> {
        if (!this.keytarModule) {
            throw new Error('Unable to use keytar.');
        }

        return this.keytarModule.setPassword(service, account, password);
    }

    public deletePassword(service: string, account: string): Promise<boolean> {
        if (!this.keytarModule) {
            throw new Error('Unable to use keytar.');
        }

        return this.keytarModule.deletePassword(service, account);
    }
}

/**
 * Globals for keytar that allow for testing
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace keytar {
    // eslint-disable-next-line prefer-const
    export let instance: Keytar = new KeytarClass();
}
