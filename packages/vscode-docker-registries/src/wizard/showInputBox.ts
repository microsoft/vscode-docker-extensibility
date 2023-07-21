/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, InputBox, window } from 'vscode';
import { RegistryWizardPromptStepOptions } from "./RegistryWizardPromptStep";

export async function showInputBox(options: RegistryWizardPromptStepOptions): Promise<string> {
    const disposables: Disposable[] = [];
    try {
        const inputBox: InputBox = window.createInputBox();
        inputBox.password = options?.isSecretStep ?? false;
        inputBox.title = options?.prompt ?? '';

        disposables.push(inputBox);

        inputBox.show();

        return await new Promise<string>((resolve, reject): void => {
            disposables.push(
                inputBox.onDidAccept(() => {
                    resolve(inputBox.value);
                }),
                inputBox.onDidHide(() => {
                    reject(new Error('Input box was hidden without providing any value.'));
                })
            );
        });
    } finally {
        disposables.forEach(d => {
            d.dispose();
        });
    }
}
