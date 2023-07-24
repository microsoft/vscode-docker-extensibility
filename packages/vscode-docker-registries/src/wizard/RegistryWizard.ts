/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationError, CancellationToken } from "vscode";
import { RegistryWizardContext } from "./RegistryWizardContext";
import { RegistryWizardPromptStep } from "./RegistryWizardPromptStep";

export class RegistryWizard<T extends RegistryWizardContext> {

    public title: string | undefined;
    private readonly _promptSteps: RegistryWizardPromptStep<T>[];
    private readonly _context: T;
    private cancellationToken: CancellationToken;

    public currentStepId: string | undefined;

    public constructor(context: T, steps: RegistryWizardPromptStep<T>[], cancellationTokenSource: CancellationToken) {
        this._promptSteps = steps.reverse();
        this._context = context;
        this.cancellationToken = cancellationTokenSource; //TODO: convert these to an interface maybe?
    }

    public async prompt(): Promise<void> {
        let step: RegistryWizardPromptStep<T> | undefined = this._promptSteps.pop();

        while (step) {
            if (this.cancellationToken.isCancellationRequested) {
                throw new CancellationError();
            }

            if (step.shouldPrompt(this._context)) {
                await step.prompt(this._context);
            }

            step = this._promptSteps.pop();
        }
    }
}
