/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CachingRegistryProviderBase } from "../../CachingProvider/CachingRegistryProviderBase";
import { CachingRegistryBase, CachingRegistryState } from "../../CachingProvider/CachingRegistryBase";
import { CachingRepositoryBase } from "../../CachingProvider/CachingRepositoryBase";
import { DockerTag } from "../../contracts/DockerTag";
import { DockerRepository } from "../../contracts/DockerRepository";
import { DockerRegistry } from "../../contracts/DockerRegistry";
import { CancellationToken, Memento } from "vscode";
import { TestMemento } from "../TestMemento";
import { keytar } from "../../CachingProvider/utils/keytar";
import { DockerCredentials } from "../../contracts/DockerCredentials";
import { TestCancellationToken } from "../TestCancellationToken";

export const testLabel = 'test label';
export const testContextValue = 'testContextValue';
export const testTags = ['test1', 'test2'];

export const credentials: DockerCredentials = {
    service: 'test',
    account: 'test',
    secret: 'test',
}

export class TestCachingTag implements DockerTag {
    public readonly contextValue = testContextValue;

    public constructor(public readonly label: string) {

    }

    public canary = false;
}

export class TestCachingRepository extends CachingRepositoryBase {
    public readonly label = testLabel;
    public readonly contextValue = testContextValue;

    public canary = false;

    public async getTagsImpl(token: CancellationToken): Promise<DockerTag[]> {
        return testTags.map(t => new TestCachingTag(t));
    }
}

export class TestCachingRegistry extends CachingRegistryBase<CachingRegistryState> {
    public readonly label = testLabel;
    public readonly contextValue = testContextValue;
    public readonly baseImagePath = 'test';

    public canary = false;

    public async getRepositoriesImpl(token: CancellationToken): Promise<DockerRepository[]> {
        return [new TestCachingRepository()];
    }

    public static async connect(parent: TestCachingRegistryProvider, registryId: string, memento: TestMemento): Promise<TestCachingRegistry> {
        const reg = new TestCachingRegistry(parent, registryId, memento);
        await reg.setState({
            service: credentials.service,
            account: credentials.account,
        });
        await keytar.instance.setPassword(credentials.service, credentials.account, credentials.secret);

        return reg;
    }
}

export class TestCachingRegistryProvider extends CachingRegistryProviderBase {
    public readonly label = testLabel;
    public readonly contextValue = testContextValue;
    public readonly providerId = 'TestCachingRegistryProvider';

    protected readonly registryConstructor = TestCachingRegistry;

    private constructor(globalState: Memento) {
        super(globalState);
    }

    public get memento(): TestMemento {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (this as any).globalState
    }

    protected async connectRegistryImpl(registryId: string, token: CancellationToken): Promise<DockerRegistry> {
        return TestCachingRegistry.connect(this, registryId, this.memento);
    }

    public static async setup(): Promise<{ provider: TestCachingRegistryProvider; firstReg: TestCachingRegistry; firstRepo: TestCachingRepository }> {
        const token = new TestCancellationToken();
        const provider = new TestCachingRegistryProvider(new TestMemento());
        await provider.connectRegistry(new TestCancellationToken());
        const firstReg = (await provider.getRegistries(true, token))[0] as TestCachingRegistry;
        const firstRepo = (await firstReg.getRepositories(true, token))[0] as TestCachingRepository;

        return {
            provider,
            firstReg,
            firstRepo,
        };
    }
}
