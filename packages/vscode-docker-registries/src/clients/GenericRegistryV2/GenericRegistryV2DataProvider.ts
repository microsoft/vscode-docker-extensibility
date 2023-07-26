/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { RegistryV2DataProvider, V2Registry, V2RegistryItem } from '../RegistryV2/RegistryV2DataProvider';
import { CommonRegistryRoot } from '../Common/models';
import { BasicOAuthProvider } from '../../auth/BasicOAuthProvider';
import { GenericRegistryV2WizardContext, GenericRegistryV2WizardPromptStep } from './GenericRegistryV2WizardPromptStep';
import { RegistryWizard } from '../../wizard/RegistryWizard';
import { RegistryWizardSecretPromptStep, RegistryWizardUsernamePromptStep } from '../../wizard/RegistryWizardPromptStep';

const GenericV2StorageKey = 'GenericV2ContainerRegistry';
const TrackedRegistriesKey = `${GenericV2StorageKey}.TrackedRegistries`;

export class GenericRegistryV2DataProvider extends RegistryV2DataProvider {
    public readonly id = 'vscode-docker.genericRegistryV2DataProvider';
    public readonly label = 'Generic Registry V2';
    public readonly description: undefined;
    public readonly iconPath = new vscode.ThemeIcon('link');

    private readonly authenticationProviders = new Map<string, BasicOAuthProvider>(); // The tree items are too short-lived to store the associated auth provider so keep a cache

    public constructor(private readonly extensionContext: vscode.ExtensionContext) {
        super();
    }

    public async getRegistries(root: CommonRegistryRoot | V2RegistryItem): Promise<V2Registry[]> {
        const trackedRegistryStrings = this.extensionContext.globalState.get<string[]>(TrackedRegistriesKey, []);
        const trackedRegistries = trackedRegistryStrings.map(r => vscode.Uri.parse(r));

        return trackedRegistries.map(r => {
            return {
                label: r.toString(),
                registryUri: r,
                parent: root,
                type: 'commonregistry',
            };
        });
    }

    public async onConnect(): Promise<void> {
        await this.addTrackedRegistry();
    }

    public async onDisconnect(): Promise<void> {
        //TODO: call removeTrackedRegistry
    }

    protected override getAuthenticationProvider(item: V2RegistryItem): BasicOAuthProvider {
        const registry = item.registryUri.toString();

        if (!this.authenticationProviders.has(registry)) {
            const provider = new BasicOAuthProvider(this.extensionContext.globalState, this.extensionContext.secrets, item.registryUri);
            this.authenticationProviders.set(registry, provider);
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.authenticationProviders.get(registry)!;
    }

    private async addTrackedRegistry(): Promise<void> {
        const wizardContext: GenericRegistryV2WizardContext = {
            registryPrompt: vscode.l10n.t('Registry URL'), // TODO: change prompt
            usernamePrompt: vscode.l10n.t('Registry Username'), // TODO: change prompt
            secretPrompt: vscode.l10n.t('Registry Personal Access Token'), // TODO: change prompt
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
        const index = trackedRegistryStrings.findIndex(r => r === registryUriString);
        if (index > -1) { // if found, throw error
            throw new Error('Registry already exists'); //TODO: localize and see if there is a better way to handle this
        }
        trackedRegistryStrings.push(registryUriString);
        void this.extensionContext.globalState.update(TrackedRegistriesKey, trackedRegistryStrings);

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

    private removeTrackedRegistry(registry: V2Registry): void {
        const trackedRegistryStrings = this.extensionContext.globalState.get<string[]>(TrackedRegistriesKey, []);
        const index = trackedRegistryStrings.findIndex(r => r === registry.registryUri.toString());
        if (index !== -1) {
            trackedRegistryStrings.splice(index, 1);
            void this.extensionContext.globalState.update(TrackedRegistriesKey, trackedRegistryStrings);
        }
        this.authenticationProviders.delete(registry.registryUri.toString());
    }
}
