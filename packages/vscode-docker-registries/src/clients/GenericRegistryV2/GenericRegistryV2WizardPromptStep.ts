import { Uri } from 'vscode';
import { RegistryWizardPromptStep } from '../../wizard/RegistryWizardPromptStep';
import { showInputBox } from '../../wizard/showInputBox';
import { RegistryWizardContext } from '../../wizard/RegistryWizardContext';

export interface GenericRegistryV2WizardContext extends RegistryWizardContext {
    readonly registryPrompt: string;
    registryUri?: Uri;
}

export class GenericRegistryV2WizardPromptStep<T extends GenericRegistryV2WizardContext> extends RegistryWizardPromptStep<T> {
    public async prompt(wizardContext: T): Promise<void> {
        const url = await showInputBox({ isSecretStep: false, prompt: wizardContext.registryPrompt || '' });
        wizardContext.registryUri = Uri.parse(url);
    }

    public shouldPrompt(wizardContext: T): boolean {
        return !!wizardContext.registryPrompt && !wizardContext.registryUri;
    }
}
