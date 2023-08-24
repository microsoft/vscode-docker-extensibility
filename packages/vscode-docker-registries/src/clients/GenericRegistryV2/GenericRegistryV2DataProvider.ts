/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryV2DataProvider, V2Registry, V2RegistryRoot, V2Repository, V2Tag } from '../RegistryV2/RegistryV2DataProvider';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { GenericRegistryV2WizardContext, GenericRegistryV2WizardPromptStep } from './GenericRegistryV2WizardPromptStep';
import { RegistryWizard } from '../../wizard/RegistryWizard';
import { RegistryWizardSecretPromptStep, RegistryWizardUsernamePromptStep } from '../../wizard/RegistryWizardPromptStep';
import { CommonTag } from '../Common/models';
import { registryV2Request } from '../RegistryV2/registryV2Request';

const GenericV2StorageKey = 'GenericV2ContainerRegistry';
const TrackedRegistriesKey = `${GenericV2StorageKey}.TrackedRegistries`;

interface GenericV2RegistryRoot extends V2RegistryRoot {
    readonly additionalContextValues: ['genericRegistryV2Root'];
}

interface GenericV2Registry extends V2Registry {
    readonly additionalContextValues: ['genericRegistryV2Registry'];
}

interface GenericV2RegistryTag extends V2Tag {
    readonly additionalContextValues: ['genericRegistryV2Tag'];
}

export function isGenericV2Registry(item: unknown): item is GenericV2Registry {
    return !!item && typeof item === 'object' && (item as GenericV2Registry).additionalContextValues?.includes('genericRegistryV2Registry') === true;
}

export class GenericRegistryV2DataProvider extends RegistryV2DataProvider {
    public readonly id = 'vscode-docker.genericRegistryV2DataProvider';
    public readonly label = 'Generic Registry V2';
    public readonly description: undefined;
    public readonly iconPath = new vscode.ThemeIcon('link');

    private readonly authenticationProviders = new Map<string, BasicOAuthProvider>(); // The tree items are too short-lived to store the associated auth provider so keep a cache

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();
    }

    public async onConnect(): Promise<void> {
        await this.addTrackedRegistry();
    }

    public getRoot(): GenericV2RegistryRoot {
        return {
            parent: undefined,
            label: this.label,
            type: 'commonroot',
            iconPath: this.iconPath,
            additionalContextValues: ['genericRegistryV2Root'],
        };
    }

    public async getRegistries(root: GenericV2RegistryRoot | GenericV2Registry): Promise<GenericV2Registry[]> {
        const trackedRegistryStrings = this.extensionContext.globalState.get<string[]>(TrackedRegistriesKey, []);
        const trackedRegistries = trackedRegistryStrings.map(r => vscode.Uri.parse(r));

        return trackedRegistries.map(r => {
            return {
                label: r.toString(),
                parent: root,
                type: 'commonregistry',
                additionalContextValues: ['genericRegistryV2Registry'],
                baseUrl: r
            };
        });
    }

    public async getTags(repository: V2Repository): Promise<GenericV2RegistryTag[]> {
        const tags = await super.getTags(repository);
        const tagsWithAdditionalContext: GenericV2RegistryTag[] = tags.map(tag => ({
            ...tag,
            additionalContextValues: ['genericRegistryV2Tag']
        }));

        return tagsWithAdditionalContext;
    }

    protected override getAuthenticationProvider(item: GenericV2Registry): BasicOAuthProvider {
        const registry = item.baseUrl.toString();

        if (!this.authenticationProviders.has(registry)) {
            const provider = new BasicOAuthProvider(this.extensionContext.globalState, this.extensionContext.secrets, item.baseUrl);
            this.authenticationProviders.set(registry, provider);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.authenticationProviders.get(registry)!;
    }

    public async addTrackedRegistry(): Promise<void> {
        const wizardContext: GenericRegistryV2WizardContext = {
            registryPrompt: vscode.l10n.t('Registry URL'),
            registryPromptPlaceholder: vscode.l10n.t('http://localhost:5000'),
            usernamePrompt: vscode.l10n.t('Registry Username'),
            secretPrompt: vscode.l10n.t('Registry Password or Personal Access Token'),
        };

        const wizard = new RegistryWizard(
            wizardContext,
            [
                new GenericRegistryV2WizardPromptStep(),
                new RegistryWizardUsernamePromptStep(),
                new RegistryWizardSecretPromptStep(),
            ],
            new vscode.CancellationTokenSource().token
        );

        await wizard.prompt();

        if (!wizardContext.registryUri) {
            throw new Error('Registry URL is invalid');
        }

        const registryUriString = wizardContext.registryUri.toString();

        // store registry url in memento
        const trackedRegistryStrings = this.extensionContext.globalState.get<string[]>(TrackedRegistriesKey, []);
        trackedRegistryStrings.push(registryUriString);
        await this.extensionContext.globalState.update(TrackedRegistriesKey, trackedRegistryStrings);

        // store credentials in auth provider
        const authProvider = new BasicOAuthProvider(this.extensionContext.globalState, this.extensionContext.secrets, wizardContext.registryUri);
        await authProvider.storeBasicCredentials(
            {
                username: wizardContext.username || '',
                secret: wizardContext.secret || '',
            }
        );
        this.authenticationProviders.set(registryUriString, authProvider);
    }

    public async removeTrackedRegistry(registry: GenericV2Registry): Promise<void> {
        // remove registry url from list of tracked registries
        const registryUriString = registry.baseUrl.toString();
        const trackedRegistryStrings = this.extensionContext.globalState.get<string[]>(TrackedRegistriesKey, []);
        const index = trackedRegistryStrings.findIndex(r => r === registryUriString);
        if (index !== -1) {
            trackedRegistryStrings.splice(index, 1);
            void this.extensionContext.globalState.update(TrackedRegistriesKey, trackedRegistryStrings);
        }

        // remove credentials from auth provider
        await this.authenticationProviders.get(registryUriString)?.removeSession();
        this.authenticationProviders.delete(registryUriString);
        // TODO: check if the map of auth providers is empty, if so, remove the root from the tree
    }

    public async deleteTag(item: CommonTag): Promise<void> {
        const digest = await this.getImageDigest(item);
        const registry = item.parent.parent as unknown as GenericV2Registry;
        await registryV2Request({
            authenticationProvider: this.getAuthenticationProvider(registry),
            method: 'DELETE',
            registryUri: registry.baseUrl,
            path: ['v2', item.parent.label, 'manifests', digest],
            scopes: [`repository:${item.parent.label}:pull`],
            headers: {
                'accept': 'application/vnd.docker.distribution.manifest.v2+json'
            }
        });
    }

    public async getImageDigest(item: CommonTag): Promise<string> {
        const registry = item.parent.parent as unknown as GenericV2Registry;
        const response = await registryV2Request({
            authenticationProvider: this.getAuthenticationProvider(registry),
            method: 'GET',
            registryUri: registry.baseUrl,
            path: ['v2', item.parent.label, 'manifests', item.label],
            scopes: [`repository:${item.parent.label}:pull`],
            headers: {
                'accept': 'application/vnd.docker.distribution.manifest.v2+json'
            }
        });

        const digest = response.headers['docker-content-digest'];
        if (!digest) {
            throw new Error('Could not find digest');
        }

        return digest;
    }
}
