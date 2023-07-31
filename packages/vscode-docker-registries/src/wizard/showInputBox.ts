/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationError, Disposable, InputBox, InputBoxOptions, window } from 'vscode';
import { RegistryWizardPromptStepOptions } from "./RegistryWizardPromptStep";

export type InputBoxValidationResult = Awaited<ReturnType<Required<InputBoxOptions>['validateInput']>>;

export async function showInputBox(options: RegistryWizardPromptStepOptions): Promise<string> {
    const disposables: Disposable[] = [];
    try {
        const inputBox: InputBox = window.createInputBox();
        disposables.push(inputBox);

        inputBox.password = !!options.isSecretStep;
        inputBox.title = options.prompt ?? '';

        let latestValidation: Promise<InputBoxValidationResult> = options.validateInput ? Promise.resolve(options.validateInput(inputBox.value)) : Promise.resolve('');
        return await new Promise<string>((resolve, reject): void => {
            disposables.push(
                inputBox.onDidChangeValue(async text => {
                    if (options.validateInput) {
                        const validation: Promise<InputBoxValidationResult> = Promise.resolve(options.validateInput(text));
                        latestValidation = validation;
                        const message: InputBoxValidationResult = await validation;
                        if (validation === latestValidation) {
                            inputBox.validationMessage = message || '';
                        }
                    }
                }),
                inputBox.onDidAccept(() => {
                    resolve(inputBox.value);
                }),
                inputBox.onDidHide(() => {
                    reject(new CancellationError());
                }),
            );
            inputBox.show();
        });
    } finally {
        disposables.forEach(d => {
            d.dispose();
        });
    }
}
