import * as vscode from 'vscode';
import { validateTomcatHome } from '../lib/tomcatValidator';
import { markInternalUpdate } from '../lib/state';

export function registerSelectTomcatHomeCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('happy-spring-tomcat.selectTomcatHome', async () => {
        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Tomcat Home Directory'
        });

        if (!selectedFolder || !selectedFolder[0]) { return undefined; }

        const tomcatHome = selectedFolder[0].fsPath;

        const validation = validateTomcatHome(tomcatHome);
        if (!validation.valid) {
            vscode.window.showErrorMessage(`Selected path is not a valid Tomcat Home: ${validation.reason}`);
            return undefined;
        }

        markInternalUpdate();  // [Item 9]
        const config = vscode.workspace.getConfiguration('happySpringTomcat');
        await config.update('tomcatHome', tomcatHome, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage(`Tomcat Home set to: ${tomcatHome}`);
        return tomcatHome;
    });

    context.subscriptions.push(disposable);
}
