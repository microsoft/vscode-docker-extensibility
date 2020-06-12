/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Keytar } from "../CachingProvider/utils/keytar";

export class TestKeytar implements Keytar {
    public readonly cache: { [key: string]: { [key: string]: string } } = {};

    public async getPassword(service: string, account: string): Promise<string | undefined> {
        return this.cache[service]?.[account];
    }

    public async setPassword(service: string, account: string, password: string): Promise<void> {
        this.cache[service] = this.cache[service] ?? {};
        this.cache[service][account] = password;
    }

    public async deletePassword(service: string, account: string): Promise<boolean> {
        if (this.cache[service]?.[account]) {
            delete this.cache[service]?.[account];

            // If nothing remains delete the service too
            if (Object.keys(this.cache[service]).length === 0) {
                delete this.cache[service];
            }

            return true;
        }

        return false;
    }
}
