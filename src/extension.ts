import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	// console.log('Congratulations, your extension "autobuilder-for-c" is now active!');

	const disposable = vscode.commands.registerCommand('autobuilder-for-c.buildProject', () => {
		vscode.window.showInformationMessage('Hello World from AutoBuilder for c++!');

	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
