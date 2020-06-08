/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerRegistry } from "../contracts/DockerRegistry";
import { CancellationToken, Memento } from "vscode";
import { DockerRepository } from "../contracts/DockerRepository";
import { DockerRegistryProviderBase, DockerCredentials } from "..";
import { keytar } from "./utils/keytar";

/**
 * State kept for all `CachingRegistryBase` implementations
 */
export interface CachingRegistryState {
    /**
     * The service / URL of the registry
     */
    service: string;

    /**
     * The account / username of the registry
     */
    account: string;

    // Account secret is kept by keytar and not exposed here
}

/**
 * Base class for a caching registry. Handles in-memory caching and cross-session memento caching.
 */
export abstract class CachingRegistryBase<TState extends CachingRegistryState> implements DockerRegistry {
    // @inheritdoc
    public abstract readonly label: string;
    // @inheritdoc
    public abstract readonly contextValue: string;
    // @inheritdoc
    public abstract readonly baseImagePath: string;

    /**
     * In-memory cache
     */
    private cache: DockerRepository[] | undefined;

    /**
     * Memento state key
     */
    private readonly stateKey: string;

    /**
     * Gets the persistent state for this registry. Not modifiable, use `setState` instead.
     */
    protected get state(): TState {
        const state = this.globalState.get<TState | undefined>(this.stateKey);

        if (!state) {
            throw new Error(`Registry state retrieved before being set. Key = '${this.stateKey}'`);
        }

        return state;
    }

    /**
     * Sets the persistent state for this registry
     * @param state The state to set
     */
    protected async setState(state: TState | undefined): Promise<void> {
        return this.globalState.update(this.stateKey, state);
    }

    /**
     * Constructs a `CachingRegistryBase` object
     * @param parent The parent provider
     * @param registryId The registry ID
     * @param globalState Memento storage
     */
    public constructor(protected readonly parent: DockerRegistryProviderBase, public readonly registryId: string, private readonly globalState: Memento) {
        this.stateKey = `vscode-docker-registries.${this.parent.providerId}.${this.registryId}.state`;
    }

    // @inheritdoc
    public async getRepositories(refresh: boolean, token: CancellationToken): Promise<DockerRepository[]> {
        if (refresh) {
            this.cache = undefined;
        }

        if (this.cache === undefined) {
            this.cache = await this.getRepositoriesImpl(token);
        }

        return this.cache;
    }

    /**
     * Get the repositories for this registry from live data
     * @param token Cancellation token
     */
    protected abstract getRepositoriesImpl(token: CancellationToken): Promise<DockerRepository[]>;

    // @inheritdoc
    public async getDockerLoginCredentials(token: CancellationToken): Promise<DockerCredentials> {
        return {
            service: this.state.service,
            account: this.state.account,
            secret: await keytar.instance.getPassword(this.state.service, this.state.account) ?? '',
        };
    }

    /**
     * Clears out the state
     * @internal
     */
    public async clearState(): Promise<void> {
        await keytar.instance.deletePassword(this.state.service, this.state.account)
        await this.setState(undefined);
    }
}
