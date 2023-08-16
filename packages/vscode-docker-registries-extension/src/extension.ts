// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { DockerHubRegistryDataProvider, GenericRegistryV2DataProvider, GitHubRegistryDataProvider } from '@microsoft/vscode-docker-registries';
import { UnifiedRegistryTreeDataProvider } from './UnifiedRegistryTreeDataProvider';
import { AzureRegistryDataProvider } from './clients/Azure/AzureRegistryDataProvider';
import { GitLabRegistryDataProvider } from './clients/GitLab/GitLabRegistryDataProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const genericRegistryV2DataProvider = new GenericRegistryV2DataProvider(context);

	const urtdp = new UnifiedRegistryTreeDataProvider(context.globalState);
	urtdp.registerProvider(new GitHubRegistryDataProvider(context));
	urtdp.registerProvider(new DockerHubRegistryDataProvider(context));
	urtdp.registerProvider(new AzureRegistryDataProvider(context));
	urtdp.registerProvider(genericRegistryV2DataProvider);
	urtdp.registerProvider(new GitLabRegistryDataProvider(context));

	let treeView: vscode.TreeView<unknown>;
	context.subscriptions.push(treeView = vscode.window.createTreeView('dockerRegistries2', { treeDataProvider: urtdp }));

	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.refreshRegistries', () => urtdp.refresh()));
	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.connectRegistry', () => urtdp.connectRegistryProvider()));
	context.subscriptions.push(vscode.commands.registerCommand('dockerRegistries2.disconnectRegistry', (item) => urtdp.disconnectRegistryProvider(item)));
	context.subscriptions.push(
		vscode.commands.registerCommand('dockerRegistries2.removeTrackedGenericV2Registry', async (item) => {
			await genericRegistryV2DataProvider.removeTrackedRegistry(item.wrappedItem);
			urtdp.refresh();
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand('dockerRegistries2.addTrackedGenericV2Registry', async () => {
			await genericRegistryV2DataProvider.addTrackedRegistry();
			urtdp.connectRegistryProvider(genericRegistryV2DataProvider);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('dockerRegistries2.untagAzureImage', async (item) => {
			const provider = item.provider as AzureRegistryDataProvider;
			await provider.deleteTag(item.wrappedItem);
			urtdp.refresh();
		})
	);

	return {
		memento: {
			globalState: context.globalState,
			workspaceState: context.workspaceState,
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
