import * as vscode from 'vscode';
import { findDocBaseCandidates } from '../lib/docBaseFinder';
import { markInternalUpdate, clearInternalUpdate } from '../lib/state';

export function registerSelectDocBaseCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('happy-spring-tomcat.selectDocBase', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) { return undefined; }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const candidates = findDocBaseCandidates(projectRoot);
        let selectedDocBase: string | undefined;

        if (candidates.length > 0) {
            selectedDocBase = await pickFromCandidates(projectRoot, candidates);
        } else {
            selectedDocBase = await pickFromDialog();
        }

        if (!selectedDocBase) { return undefined; }

        let docBaseConfig = selectedDocBase;
        if (docBaseConfig.startsWith(projectRoot)) {
            docBaseConfig = docBaseConfig.replace(projectRoot, '${workspaceFolder}').replace(/\\/g, '/');
        }

        const config = vscode.workspace.getConfiguration('happySpringTomcat');
        markInternalUpdate();  // [Item 9] suppress config-change re-apply prompt
        await config.update('docBase', docBaseConfig, vscode.ConfigurationTarget.Workspace);
        clearInternalUpdate();
        vscode.window.showInformationMessage(`docBase set to: ${docBaseConfig}`);
        return docBaseConfig;
    });

    context.subscriptions.push(disposable);
}

async function pickFromCandidates(projectRoot: string, candidates: string[]): Promise<string | undefined> {
    const items = [
        ...candidates.map(c => ({
            label: `$(folder) ${c.replace(projectRoot, '').replace(/^[/\\]/, '')}`,
            description: 'Detected webapp directory',
            fsPath: c
        })),
        { label: '$(folder-opened) Select manually...', description: 'Browse for a different folder', fsPath: 'MANUAL' }
    ];

    const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select Webapp docBase Directory'
    });

    if (!selection) { return undefined; }
    if (selection.fsPath === 'MANUAL') { return pickFromDialog(); }
    return selection.fsPath;
}

async function pickFromDialog(): Promise<string | undefined> {
    const picked = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Webapp docBase Directory'
    });
    return picked?.[0]?.fsPath;
}
