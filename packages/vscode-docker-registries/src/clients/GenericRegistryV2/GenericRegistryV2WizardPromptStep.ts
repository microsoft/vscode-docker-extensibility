/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri } from 'vscode';
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

    private validateUrl(url: string): string | undefined {
        try {
            Uri.parse(url, true);
        } catch (error: unknown) {
            return 'Invalid URL';
        }

        return undefined; // the value is valid
    }
}
