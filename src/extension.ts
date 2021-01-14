import * as vscode from 'vscode';

const extName = (str: string) => `config-sync: ${str}`;

export const activate = (context: vscode.ExtensionContext) => {
	console.log('config-sync is now active.');

	const uploadFile = vscode.commands.registerCommand('config-sync.uploadFile', async () => {
		const input = await vscode.window.showInputBox({
			prompt: extName(`Please enter the file name relative to workspace directory. For example: '.gitignore' or src/config/.eslintrc.js`),
			ignoreFocusOut: true,
			placeHolder: 'File name'
		});

		if (input === undefined || input === '') {
			vscode.window.showInformationMessage(extName('Input was not captured.'));
			return;
		}

		const file = await vscode.workspace.findFiles(input, '', 1);
		
		if (file.length === 0 || file[0] === undefined) {
			vscode.window.showInformationMessage(extName(`Invalid file name: '${input}'. Please make sure this is a file name relative to workspace directory.`));
			return;
		}

		console.log(file[0]);

		vscode.window.showInformationMessage(extName(`Valid file located: '${input}'.`));

		const contents = await vscode.workspace.fs.readFile(file[0]);
		const contentsString = Buffer.from(contents).toString();
		console.log(contentsString);

		// TODO: oauth user login
		// save configs to database with user id (under sets of configs under names such as 'react app')
		// fetch configs from database (and check for file name conflict)
		// about page?

	});

	context.subscriptions.push(uploadFile);
};

export const deactivate = () => {};
