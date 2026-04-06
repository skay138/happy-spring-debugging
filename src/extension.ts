import * as vscode from 'vscode';
import { registerSetupCommand } from './commands/setup';
import { registerSelectTomcatHomeCommand } from './commands/selectTomcatHome';
import { registerSelectDocBaseCommand } from './commands/selectDocBase';
import { registerMaintenanceCommands } from './commands/maintenance';
import { registerStatusBar } from './commands/statusBar';

export function activate(context: vscode.ExtensionContext) {
    registerSetupCommand(context);
    registerSelectTomcatHomeCommand(context);
    registerSelectDocBaseCommand(context);
    registerMaintenanceCommands(context);
    registerStatusBar(context);
}

export function deactivate() {}
