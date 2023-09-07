/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InputBoxOptions, window } from 'vscode';
import { RegistryWizardPromptStepOptions } from "./RegistryWizardPromptStep";

export type InputBoxValidationResult = Awaited<ReturnType<Required<InputBoxOptions>['validateInput']>>;

export async function showInputBox(options: RegistryWizardPromptStepOptions): Promise<string | undefined> {
    return await window.showInputBox({
        prompt: options.prompt,
        placeHolder: options.placeholder,
        ignoreFocusOut: true,
        password: !!options.isSecretStep,
        validateInput: options.validateInput,
    });
}
