import * as vscode from 'vscode';
import * as mongoose from 'mongoose';
import ConfigFile, { ConfigFileInterface } from './ConfigFile';

const extName = (str: string) => `config-sync: ${str}`;

const generateFilename = (fileNameInput: string, alias: string) => `config-sync-${alias}-${fileNameInput}`;

const attemptDbConnection = async (dbAddr: string) => {
  if (dbAddr !== '') {
    return new Promise<void>((resolve) => {
      mongoose.connect(dbAddr, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
        if (err) {
          vscode.window.showErrorMessage(extName(`Could not connect to database. ${err}`));
          resolve();
        }
        vscode.window.showInformationMessage(extName('Connected to database.'));
        resolve();
      });
    });
  }
};

const checkDatabase = async (context: vscode.ExtensionContext) => {
  let globalStorage;

  try {
    globalStorage = await vscode.workspace.fs.readDirectory(context.globalStorageUri);
  } catch {
    await vscode.workspace.fs.createDirectory(context.globalStorageUri);
    globalStorage = await vscode.workspace.fs.readDirectory(context.globalStorageUri);
  }

  if (globalStorage.some((file) => file[0] === 'config-sync-DB_CONNECTION_STRING_ENV')) {
    return Buffer.from(await vscode.workspace.fs.readFile(vscode.Uri.parse(`${context.globalStorageUri.path}/config-sync-DB_CONNECTION_STRING_ENV`))).toString();
  } else {
    vscode.window.showWarningMessage(extName(`No database connection string has been set. Please run 'config-sync: Add Connection to MongoDB Database' if you would like this feature. Files will be stored locally if this is not set up.`));
    return '';
  }
};

export const activate = async (context: vscode.ExtensionContext) => {
  console.log('config-sync is now active.');

  let dbAddr = await checkDatabase(context);

  await attemptDbConnection(dbAddr);

  const addDatabase = vscode.commands.registerCommand('config-sync.addDatabase', async () => {
    try {
      await vscode.workspace.fs.readDirectory(context.globalStorageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(context.globalStorageUri);
    }

    const dbString = await vscode.window.showInputBox({
      prompt: extName(`Please enter a database connection string if you would like to use config-sync with a remote MongoDB database instead of local storage. If you enter nothing or exit this prompt, storing to a database will not be possible. This extension will never store this information anywhere except your local storage. The author of this extension does not have access to this data. Check the source code if you want to make sure.`),
      ignoreFocusOut: true,
      placeHolder: 'Database connection string (such as mongodb+srv://<username>:<password>@<db-address>)'
    });
    if (dbString === undefined) {
      return;
    }
    dbAddr = dbString;
    vscode.workspace.fs.writeFile(vscode.Uri.parse(`${context.globalStorageUri.path}/config-sync-DB_CONNECTION_STRING_ENV`), Buffer.from(dbString));
    mongoose.connect(dbString, { useNewUrlParser: true, useUnifiedTopology: true }, (err) => {
      if (err) {
        vscode.window.showErrorMessage(extName(`Could not connect to database. ${err}`));
        return;
      }
      vscode.window.showInformationMessage(extName('Connected to database.'));
    });
  });

  const storeFile = vscode.commands.registerCommand('config-sync.storeFile', async () => {
    const fileNameInput = await vscode.window.showInputBox({
      prompt: extName(`Please enter the file name relative to workspace directory. For example: '.gitignore' or src/config/.eslintrc.js`),
      ignoreFocusOut: true,
      placeHolder: 'File name'
    });

    if (fileNameInput === undefined || fileNameInput === '') {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
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
        prompt: extName(`Please give this file an alias. The alias cannot contain dashes.`),
        ignoreFocusOut: true,
      });

      if (tempAlias === undefined || tempAlias === '') {
        vscode.window.showErrorMessage(extName('Input was not captured.'));
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
      vscode.window.showErrorMessage(extName(`'${fileNameInput.includes('/') ? fileNameInput.split('/').pop()! : fileNameInput}' with alias '${alias}' already exists in the local storage. Please change the alias or select a different file.`));
      return;
    }

    vscode.workspace.fs.writeFile(vscode.Uri.parse(`${storageUri.path}/${fileName}`), contents);
    vscode.window.showInformationMessage(extName('File stored successfully.'));
  });

  const uploadFile = vscode.commands.registerCommand('config-sync.uploadFile', async () => {
    if (dbAddr === '') {
      vscode.window.showErrorMessage(extName(`No database connection string has been set. Please run 'config-sync: Add Connection to Your MongoDB Database' if you would like this feature. Files can only be stored locally if this is not set up.`));
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      vscode.window.showErrorMessage(extName(`Database is not connected. This is likely due to an invalid connection string. Please run 'config-sync: Add Connection to MongoDB Database'.`));
      return;
    }
    const fileNameInput = await vscode.window.showInputBox({
      prompt: extName(`Please enter the file name relative to workspace directory. For example: '.gitignore' or src/config/.eslintrc.js`),
      ignoreFocusOut: true,
      placeHolder: 'File name'
    });

    if (fileNameInput === undefined || fileNameInput === '') {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
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

    let alias = '-';

    while (alias.includes('-')) {
      const tempAlias = await vscode.window.showInputBox({
        prompt: extName(`Please give this file an alias. The alias cannot contain dashes.`),
        ignoreFocusOut: true,
      });

      if (tempAlias === undefined || tempAlias === '') {
        vscode.window.showErrorMessage(extName('Input was not captured.'));
        return;
      }

      alias = tempAlias;
    }

    const fileName = generateFilename(fileNameInput.includes('/') ? fileNameInput.split('/').pop()! : fileNameInput, alias);

    const configFile = new ConfigFile({
      fileName: fileName,
      contents: contentsString,
    });

    ConfigFile.count({ fileName: fileName }, (err, count) => {
      if (count > 0) {
        vscode.window.showErrorMessage(extName(`'${fileNameInput.includes('/') ? fileNameInput.split('/').pop()! : fileNameInput}' with alias '${alias}' already exists in the remote database. Please change the alias or select a different file.`));
        return;
      } else {
        configFile.save();
        vscode.window.showInformationMessage(extName('File uploaded successfully.'));
      }
    });

    // TODO: delete files from database
    // make it easier for others to use database (dont have to set up your own mongodb)

  });

  const viewFiles = vscode.commands.registerCommand('config-sync.viewFiles', async () => {
    if (dbAddr === '') {
      vscode.window.showErrorMessage(extName(`No database connection string has been set. Please run 'config-sync: Add Connection to Your MongoDB Database' if you would like this feature. Files can only be stored locally if this is not set up.`));
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      vscode.window.showErrorMessage(extName(`Database is not connected. This is likely due to an invalid connection string. Please run 'config-sync: Add Connection to MongoDB Database'.`));
      return;
    }

    const configFiles = await ConfigFile.find().exec().then((files: ConfigFileInterface[]) => files.map((x: ConfigFileInterface) => `${x.fileName.split('-').slice(x.fileName.split('-').length - 2, x.fileName.split('-').length - 1)} (${x.fileName.split('-').pop()})`));

    vscode.window.showInformationMessage(configFiles.toString());
  });
  
  const viewFilesLocal = vscode.commands.registerCommand('config-sync.viewFilesLocal', async () => {
    const storageUri = context.globalStorageUri;

    let configFiles: [string, vscode.FileType][];

    try {
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(storageUri);
      configFiles = await vscode.workspace.fs.readDirectory(storageUri);
    }

    vscode.window.showInformationMessage(configFiles
      .map((x) => (x[0] === 'config-sync-DB_CONNECTION_STRING_ENV') ? '' : `${x[0]
        .split('-')
        .slice(x[0].split('-').length - 2, x[0].split('-').length - 1)} (${x[0].split('-').pop()})`)
      .toString());
  });

  const getFile = vscode.commands.registerCommand('config-sync.getFile', async () => {
    if (dbAddr === '') {
      vscode.window.showErrorMessage(extName(`No database connection string has been set. Please run 'config-sync: Add Connection to Your MongoDB Database' if you would like this feature. Files can only be stored locally if this is not set up.`));
      return;
    }
    if (mongoose.connection.readyState !== 1) {
      vscode.window.showErrorMessage(extName(`Database is not connected. This is likely due to an invalid connection string. Please run 'config-sync: Add Connection to MongoDB Database'.`));
      return;
    }

    const configFiles = await ConfigFile.find().exec();

    const fileName = await vscode.window.showInputBox({
      prompt: extName(`Please enter the name (file name, not alias) of the file to retrieve. THIS WILL OVERWRITE ANY FILES IN THE ROOT OF YOUR WORKSPACE DIRECTORY WITH THE SAME NAME.`),
      ignoreFocusOut: true,
      placeHolder: 'File name'
    });
    if (fileName === undefined) {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
      return;
    }
    const alias = await vscode.window.showInputBox({
      prompt: extName(`Please enter the alias of the file to retrieve.`),
      ignoreFocusOut: true,
    });
    if (alias === undefined) {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
      return;
    }
    const files = configFiles.filter((x: ConfigFileInterface) => x.fileName === generateFilename(fileName, alias));
    if (files.length === 0) {
      vscode.window.showErrorMessage(extName(`No file with file name '${fileName}' and alias '${alias}' could be found in the database.`));
      return;
    } else if (files.length > 1) {
      vscode.window.showErrorMessage(extName(`Multiple files with file name '${fileName}' and alias '${alias}' were found in the database. This should never be possible.`));
      return;
    } else {
      if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(extName(`No workspace is open.`));
        return;
      }
      vscode.workspace.fs.writeFile(vscode.Uri.parse(`${vscode.workspace.workspaceFolders[0].uri.path}/${fileName}`), Buffer.from(files[0].contents));
    }
  });

  const getFileLocal = vscode.commands.registerCommand('config-sync.getFileLocal', async () => {
    const fileName = await vscode.window.showInputBox({
      prompt: extName(`Please enter the name (file name, not alias) of the file to retrieve. THIS WILL OVERWRITE ANY FILES IN THE ROOT OF YOUR WORKSPACE DIRECTORY WITH THE SAME NAME.`),
      ignoreFocusOut: true,
      placeHolder: 'File name'
    });
    if (fileName === undefined) {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
      return;
    }
    const alias = await vscode.window.showInputBox({
      prompt: extName(`Please enter the alias of the file to retrieve.`),
      ignoreFocusOut: true,
    });
    if (alias === undefined) {
      vscode.window.showErrorMessage(extName('Input was not captured.'));
      return;
    }

    const storageUri = context.globalStorageUri;

    let files: [string, vscode.FileType][];

    try {
      files = await vscode.workspace.fs.readDirectory(storageUri);
    } catch {
      await vscode.workspace.fs.createDirectory(storageUri);
      files = await vscode.workspace.fs.readDirectory(storageUri);
    }

    files = files.filter((x) => x[0] !== 'config-sync-DB_CONNECTION_STRING_ENV' && x[0] === generateFilename(fileName, alias));

    if (files.length === 0) {
      vscode.window.showErrorMessage(extName(`No file with file name '${fileName}' and alias '${alias}' could be found in the database.`));
      return;
    } else if (files.length > 1) {
      vscode.window.showErrorMessage(extName(`Multiple files with file name '${fileName}' and alias '${alias}' were found in the database. This should never be possible.`));
      return;
    } else {
      if (vscode.workspace.workspaceFolders === undefined) {
        vscode.window.showErrorMessage(extName(`No workspace is open.`));
        return;
      }
      vscode.workspace.fs.writeFile(vscode.Uri.parse(`${vscode.workspace.workspaceFolders[0].uri.path}/${fileName}`), await vscode.workspace.fs.readFile(vscode.Uri.parse(`${storageUri}/${generateFilename(fileName, alias)}`)));
    }
  });

  context.subscriptions.push(addDatabase, storeFile, uploadFile, viewFiles, viewFilesLocal, getFile, getFileLocal);
};

export const deactivate = () => { };
