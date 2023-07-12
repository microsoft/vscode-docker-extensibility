// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { DockerHubRegistryDataProvider, GitHubRegistryDataProvider } from '@microsoft/vscode-docker-registries';
import { UnifiedRegistryTreeDataProvider } from './UnifiedRegistryTreeDataProvider';
import { AzureRegistryDataProvider } from './clients/AzureRegistryDataProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const urtdp = new UnifiedRegistryTreeDataProvider(context.globalState);
	urtdp.registerProvider(new GitHubRegistryDataProvider(context));
	urtdp.registerProvider(new DockerHubRegistryDataProvider(context));
	urtdp.registerProvider(new AzureRegistryDataProvider(context));

	let treeView: vscode.TreeView<unknown>;
	context.subscriptions.push(treeView = vscode.window.createTreeView('dockerRegistries2', { treeDataProvider: urtdp }));

	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.refreshRegistries', () => urtdp.refresh()));
	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.connectRegistry', () => urtdp.connectRegistryProvider()));
	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.disconnectRegistry', (item) => urtdp.disconnectRegistryProvider(item)));

	return {
		memento: {
			globalState: context.globalState,
			workspaceState: context.workspaceState,
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
