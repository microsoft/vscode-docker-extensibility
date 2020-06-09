/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from "crypto";
import { BasicDockerRegistryProvider, DockerRegistryProviderBase } from "../contracts/DockerRegistryProvider";
import { Memento, CancellationToken } from "vscode";
import { DockerRegistry } from "../contracts/DockerRegistry";
import { CachingRegistryBase } from "./CachingRegistryBase";

function getRandomRegistryId(length = 8): string {
    const buffer: Buffer = crypto.randomBytes(Math.ceil(length / 2));
    return buffer.toString('hex').slice(0, length);
}

/**
 * Base class for a caching registry provider. Handles in-memory caching and cross-session memento caching.
 */
export abstract class CachingRegistryProviderBase implements BasicDockerRegistryProvider {
    // @inheritdoc
    public abstract readonly label: string;
    // @inheritdoc
    public abstract readonly contextValue: string;
    // @inheritdoc
    public abstract readonly providerId: string;

    /**
     * In-memory cache
     */
    private cache: DockerRegistry[] | undefined;

    /**
     * Gets the connected registry IDs
     */
    private get registryIds(): string[] {
        return this.globalState.get(`vscode-docker-registries.${this.providerId}.registries`, []);
    }

    /**
     * Sets the connected registry IDs
     * @param registryIds The registry IDs
     */
    private async setRegistryIds(registryIds: string[]): Promise<void> {
        return this.globalState.update(`vscode-docker-registries.${this.providerId}.registries`, registryIds.length ? registryIds : undefined);
    }

    /**
     * Constructs a `CachingRegistryProviderBase` object
     * @param globalState Memento storage
     */
    public constructor(private readonly globalState: Memento) {
    }

    // @inheritdoc
    public async getRegistries(refresh: boolean, token: CancellationToken): Promise<DockerRegistry[]> {
        if (refresh) {
            this.cache = undefined;
        }

        if (this.cache === undefined) {
            this.cache = this.registryIds.map(r => new this.registryConstructor(this, r, this.globalState));
        }

        return this.cache;
    }

    // @inheritdoc
    public async connectRegistry(token: CancellationToken): Promise<DockerRegistry> {
        const registry = await this.connectRegistryImpl(getRandomRegistryId(), token);

        await this.setRegistryIds([...this.registryIds, registry.registryId]);

        return registry;
    }

    // @inheritdoc
    public async disconnectRegistry(registry: CachingRegistryBase<never>): Promise<void> {
        if (this.providerId !== registry.providerId) {
            throw new Error(`Cannot disconnect registry with ID '${registry.registryId}' because it does not belong to provider with ID '${this.providerId}'.`);
        }

        await this.setRegistryIds(this.registryIds.filter(r => r !== registry.registryId));

        if (registry instanceof CachingRegistryBase) {
            await registry.clearState();
        }
    }

    /**
     * Constructs a new `DockerRegistry` object
     */
    protected abstract registryConstructor: new (parent: DockerRegistryProviderBase, registryId: string, globalState: Memento) => DockerRegistry;

    /**
     * Connects and constructs a new `DockerRegistry` object
     * @param registryId The registry ID
     * @param token Cancellation token
     */
    protected abstract connectRegistryImpl(registryId: string, token: CancellationToken): Promise<DockerRegistry>;
}
