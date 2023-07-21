/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RegistryWizardContext } from "./RegistryWizardContext";
import { RegistryWizardPromptStep } from "./RegistryWizardPromptStep";
import * as vscode from 'vscode';

export class RegistryWizard<T extends RegistryWizardContext> {

    public title: string | undefined;
    private readonly _promptSteps: RegistryWizardPromptStep<T>[];
    private readonly _context: T;
    private _cancellationTokenSource: vscode.CancellationTokenSource;

    public currentStepId: string | undefined;

    public constructor(context: T, steps: RegistryWizardPromptStep<T>[], cancellationTokenSource: vscode.CancellationTokenSource) {
        this._promptSteps = steps.reverse();
        this._context = context;
        this._cancellationTokenSource = cancellationTokenSource; //TODO: convert these to an interface maybe?
    }

    public async prompt(): Promise<void> {
        try {
            let step: RegistryWizardPromptStep<T> | undefined = this._promptSteps.pop();

            while (step) {
                if (this._cancellationTokenSource.token.isCancellationRequested) {
                    throw new vscode.CancellationError();
                }

                if (step.shouldPrompt(this._context)) {
                    await step.prompt(this._context);
                }

                step = this._promptSteps.pop();
            }
        } finally {
            this._cancellationTokenSource.dispose();
        }
    }
}

/**
 * const wizard = new DockerRegistriesWizard(wizardContext, {
        promptSteps: [new QuickPickRegistriesStep()],
    });
 *
 * await wizard.prompt();
 * registryKey = wizardContext.registryKey;
 */
