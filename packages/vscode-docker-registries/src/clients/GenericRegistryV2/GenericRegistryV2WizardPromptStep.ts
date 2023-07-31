/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri, l10n } from 'vscode';
import { RegistryWizardPromptStep, RegistryWizardPromptStepOptions } from '../../wizard/RegistryWizardPromptStep';
import { showInputBox } from '../../wizard/showInputBox';
import { RegistryWizardContext } from '../../wizard/RegistryWizardContext';

export interface GenericRegistryV2WizardContext extends RegistryWizardContext {
    readonly registryPrompt: string;
    registryUri?: Uri;
}

export class GenericRegistryV2WizardPromptStep<T extends GenericRegistryV2WizardContext> extends RegistryWizardPromptStep<T> {
    public async prompt(wizardContext: T): Promise<void> {
        const options: RegistryWizardPromptStepOptions = {
            isSecretStep: false,
            prompt: wizardContext.registryPrompt,
            validateInput: (value: string): string | undefined => this.validateUrl(value),
        };
        const url = await showInputBox(options);
        wizardContext.registryUri = Uri.parse(url);
    }

    public shouldPrompt(wizardContext: T): boolean {
        return !!wizardContext.registryPrompt && !wizardContext.registryUri;
    }

    private validateUrl(value: string): string | undefined {
        if (!value) {
            return l10n.t('URL cannot be empty.');
        } else {
            let protocol: string | undefined;
            let host: string | undefined;
            try {
                const uri = new URL(value);
                protocol = uri.protocol;
                host = uri.host;
            } catch {
                // ignore
            }

            if (!protocol || !host) {
                return l10n.t('Please enter a valid URL');
            } else {
                return undefined;
            }
        }
    }
}
