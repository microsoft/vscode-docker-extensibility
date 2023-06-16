// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { GitHubRegistryDataProvider } from '@microsoft/vscode-docker-registries';
import { UnifiedRegistryTreeDataProvider } from './UnifiedRegistryTreeDataProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const urtdp = new UnifiedRegistryTreeDataProvider();
	urtdp.registerProvider(new GitHubRegistryDataProvider(context.globalState, context.secrets));

	let treeView: vscode.TreeView<unknown>;
	context.subscriptions.push(treeView = vscode.window.createTreeView('dockerRegistries2', { treeDataProvider: urtdp }));
}

// This method is called when your extension is deactivated
export function deactivate() { }
