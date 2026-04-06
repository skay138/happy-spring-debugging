import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getTomcatBaseDir } from '../lib/tomcatValidator';

export function registerMaintenanceCommands(context: vscode.ExtensionContext): void {
    registerClearCacheCommand(context);
    registerViewLogsCommand(context);
}

function registerClearCacheCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('happy-spring-tomcat.clearCache', async () => {
        const tomcatBaseDir = getTomcatBaseDir(context);

        if (!tomcatBaseDir || !fs.existsSync(tomcatBaseDir)) {
            vscode.window.showWarningMessage('Tomcat base directory not found. Please run Setup first.');
            return;
        }

        const foldersToClear = ['work', 'temp'];
        const clearedPaths: string[] = [];

        try {
            for (const folder of foldersToClear) {
                const folderPath = path.join(tomcatBaseDir, folder);
                if (fs.existsSync(folderPath)) {
                    for (const file of fs.readdirSync(folderPath)) {
                        fs.rmSync(path.join(folderPath, file), { recursive: true, force: true });
                    }
                    clearedPaths.push(folder);
                }
            }
            vscode.window.showInformationMessage(`Successfully cleared Tomcat cache: ${clearedPaths.join(', ')}`);
        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to clear cache: ${err.message}. (Is Tomcat still running?)`);
        }
    });

    context.subscriptions.push(disposable);
}

function registerViewLogsCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('happy-spring-tomcat.viewLogs', async () => {
        const tomcatBaseDir = getTomcatBaseDir(context);
        const logsDir = tomcatBaseDir ? path.join(tomcatBaseDir, 'logs') : '';

        if (!logsDir || !fs.existsSync(logsDir)) {
            vscode.window.showWarningMessage('Tomcat logs directory not found. Please start Tomcat first.');
            return;
        }

        const files = fs.readdirSync(logsDir);
        if (files.length === 0) {
            vscode.window.showInformationMessage('No log files found in the logs directory.');
            return;
        }

        const latestFile = files
            .map(file => ({ file, mtime: fs.statSync(path.join(logsDir, file)).mtime }))
            .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())[0].file;

        const document = await vscode.workspace.openTextDocument(path.join(logsDir, latestFile));
        await vscode.window.showTextDocument(document, { preview: false });
    });

    context.subscriptions.push(disposable);
}
