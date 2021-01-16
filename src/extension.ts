import * as vscode from 'vscode';
// import * as dotenv from 'dotenv';

// console.log(dotenv.config());

const extName = (str: string) => `config-sync: ${str}`;

const generateFilename = (fileNameInput: string, alias: string) => `config-sync-${alias}-${fileNameInput}`;

export const activate = (context: vscode.ExtensionContext) => {
  console.log('config-sync is now active.');

  const uploadFile = vscode.commands.registerCommand('config-sync.uploadFile', async () => {
    const fileNameInput = await vscode.window.showInputBox({
      prompt: extName(`Please enter the file name relative to workspace directory. For example: '.gitignore' or src/config/.eslintrc.js`),
      ignoreFocusOut: true,
      placeHolder: 'File name'
    });

    if (fileNameInput === undefined || fileNameInput === '') {
      vscode.window.showWarningMessage(extName('Input was not captured.'));
      return;
    }

    const file = await vscode.workspace.findFiles(fileNameInput, '', 1);

    if (file.length === 0 || file[0] === undefined) {
      vscode.window.showErrorMessage(extName(`Invalid file name: '${fileNameInput}'. Please make sure this is a file name relative to workspace directory.`));
      return;
    }

    console.log(file[0]);

    vscode.window.showInformationMessage(extName(`Valid file located: '${fileNameInput}'.`));

    const contents = await vscode.workspace.fs.readFile(file[0]);
    const contentsString = Buffer.from(contents).toString();
    console.log(contentsString);

    const storageUri = context.globalStorageUri;

    let alias = '-';
    
    while (alias.includes('-')) {
      const tempAlias = await vscode.window.showInputBox({
        prompt: extName(`Please give this file an alias. The name cannot contain dashes.`),
        ignoreFocusOut: true,
      });

      if (tempAlias === undefined || tempAlias === '') {
        vscode.window.showWarningMessage(extName('Input was not captured.'));
        return;
      }

      alias = tempAlias;
    } 

    let configFiles;

    try {
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(storageUri);
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    }
    

    const fileName = generateFilename(fileNameInput.includes('/') ? fileNameInput.split('/').pop()! : fileNameInput, alias);

    if (configFiles.some((ele) => ele[0] === fileName)) {
      vscode.window.showErrorMessage(extName(`'${fileNameInput.includes('/') ? fileNameInput.split('/').pop()! : fileNameInput}' with name '${alias}' already exists. Please change the alias or select a different file.`));
      return;
    }

    vscode.workspace.fs.writeFile(vscode.Uri.parse(`${storageUri.path}/${fileName}`), contents);
    vscode.window.showInformationMessage(extName('File stored successfully.'));

    // TODO: oauth user login
    // save configs to database with user id (under sets of configs under names such as 'react app')
    // fetch configs from database (and check for file name conflict)
    // about page?

  });

  const viewFiles = vscode.commands.registerCommand('config-sync.viewFiles', async () => {
    const storageUri = context.globalStorageUri;

    let configFiles: [string, vscode.FileType][];

    try {
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(storageUri);
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    }

    vscode.window.showInformationMessage(configFiles
      .map((x) => `${x[0]
        .split('-')
        .slice(x[0].split('-').length - 2, x[0].split('-').length - 1)} (${x[0].split('-').pop()})`)
      .toString());
  });

  context.subscriptions.push(uploadFile, viewFiles);
};

export const deactivate = () => { };
