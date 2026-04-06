import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { validateTomcatHome, getTomcatBaseDir } from '../lib/tomcatValidator';
import { findDocBaseCandidates } from '../lib/docBaseFinder';
import { setupTomcatBaseDir, writeServerXml, writeContextXml, writeScripts, writeTasksJson, writeLaunchJson, ConfigWriterOptions } from '../lib/configWriter';
import { isTomcatRunning } from '../lib/portChecker';
import { markInternalUpdate, clearInternalUpdate } from '../lib/state';

export function registerSetupCommand(context: vscode.ExtensionContext): void {
    const disposable = vscode.commands.registerCommand('happy-spring-tomcat.setup', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a project first.');
            return;
        }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const vscodeDir = path.join(projectRoot, '.vscode');

        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // --- Read configuration ---
        const config = vscode.workspace.getConfiguration('happySpringTomcat');
        let tomcatHome = config.get<string>('tomcatHome', '');
        const httpPort = config.get<number>('httpPort', 8080);
        const debugPort = config.get<number>('debugPort', 8000);
        const contextPath = config.get<string>('contextPath', '');
        const docBase = config.get<string>('docBase', '${workspaceFolder}/target/exploded');
        const javaOpts = config.get<string>('javaOpts', '-Dfile.encoding=UTF-8 -Dsun.stdout.encoding=UTF-8 -Dsun.stderr.encoding=UTF-8');
        const sourceBase = config.get<string>('sourceBase', '${workspaceFolder}/src/main/webapp');
        const classesBase = config.get<string>('classesBase', '${workspaceFolder}/target/classes');
        const jndiResources = config.get<any[]>('jndiResources', []);
        const colorizeLogs = config.get<boolean>('colorizeLogs', true);
        const autoOpenBrowser = config.get<boolean>('autoOpenBrowser', true);
        const preLaunchBuild = config.get<string>('preLaunchBuild', 'none');

        // --- Ensure tomcatHome is set ---
        if (!tomcatHome) {
            const selectedHome = await vscode.commands.executeCommand<string>('happy-spring-tomcat.selectTomcatHome');
            if (selectedHome) {
                tomcatHome = selectedHome;
            } else {
                return;
            }
        }

        // --- Ensure storageUri is available ---
        const tomcatBaseDir = getTomcatBaseDir(context);
        if (!tomcatBaseDir) {
            vscode.window.showErrorMessage('Extension storage is not available. Please open a workspace folder.');
            return;
        }

        // --- Resolve docBase ---
        let resolvedDocBase = docBase.replace(/\$\{workspaceFolder\}/g, projectRoot);
        if (!fs.existsSync(resolvedDocBase)) {
            const resolved = await resolveDocBase(projectRoot, docBase);
            if (resolved === null) { return; }
            resolvedDocBase = resolved;
        }

        // --- Validate Tomcat Home ---
        const validation = validateTomcatHome(tomcatHome);
        if (!validation.valid) {
            vscode.window.showErrorMessage(`Invalid Tomcat Home: ${validation.reason}`);
            return;
        }

        // --- Resolve source / classes paths ---
        const resolvedSourceBase = sourceBase.replace(/\$\{workspaceFolder\}/g, projectRoot);
        const resolvedClassesBase = classesBase.replace(/\$\{workspaceFolder\}/g, projectRoot);

        // --- Build shared options object [Item 8] ---
        const opts: ConfigWriterOptions = {
            tomcatHome, tomcatBaseDir, projectRoot, vscodeDir,
            httpPort, debugPort, contextPath,
            resolvedDocBase, resolvedSourceBase, resolvedClassesBase,
            jndiResources, javaOpts, colorizeLogs, autoOpenBrowser
        };

        // --- Execute with progress indicator [Item 3] ---
        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Applying Tomcat Debug Setup...', cancellable: false },
            async (progress) => {
                // [Item 1] Check if Tomcat is already running before copying conf
                progress.report({ message: 'Checking Tomcat status...' });
                const running = await isTomcatRunning(httpPort);
                if (running) {
                    const answer = await vscode.window.showWarningMessage(
                        `Tomcat appears to be running on port ${httpPort}. Overwriting conf while running may cause issues. Continue?`,
                        'Continue', 'Cancel'
                    );
                    if (answer !== 'Continue') { return; }
                }

                progress.report({ message: 'Setting up Tomcat base directory...' });
                setupTomcatBaseDir(tomcatHome, tomcatBaseDir);

                progress.report({ message: 'Writing server.xml...' });
                writeServerXml(tomcatBaseDir, httpPort);

                progress.report({ message: 'Writing context.xml...' });
                writeContextXml(opts);

                progress.report({ message: 'Writing start/stop scripts...' });
                writeScripts(opts);

                progress.report({ message: 'Writing tasks.json...' });
                writeTasksJson(vscodeDir, preLaunchBuild);  // [Item 11]

                progress.report({ message: 'Writing launch.json...' });
                writeLaunchJson(vscodeDir, debugPort, httpPort, contextPath, autoOpenBrowser);

            }
        );

        // [Item 6] Success notification with "Start Tomcat" action button
        const action = await vscode.window.showInformationMessage(
            'Tomcat Debug Setup has been successfully applied!',
            'Start Tomcat'
        );
        if (action === 'Start Tomcat') {
            vscode.debug.startDebugging(workspaceFolders[0], '🚀 Tomcat — Attach Debug');
        }
    });

    context.subscriptions.push(disposable);
}

/**
 * Resolves the docBase by smart-detection or user prompt.
 * [Item 2] Returns the resolved absolute path directly — no recursive setup re-run.
 */
async function resolveDocBase(projectRoot: string, docBase: string): Promise<string | null> {
    const candidates = findDocBaseCandidates(projectRoot);

    if (candidates.length === 1) {
        const autoDocBase = candidates[0].replace(projectRoot, '${workspaceFolder}').replace(/\\/g, '/');
        markInternalUpdate();  // [Item 9]
        await vscode.workspace.getConfiguration('happySpringTomcat').update('docBase', autoDocBase, vscode.ConfigurationTarget.Workspace);
        clearInternalUpdate();
        vscode.window.showInformationMessage(`docBase automatically detected: ${autoDocBase}`);
        return candidates[0];
    }

    const prompt = candidates.length > 1
        ? 'Multiple docBase candidates found. Please select one.'
        : `docBase [${docBase}] does not exist. Please select yours.`;

    const pick = await vscode.window.showInformationMessage(prompt, 'Select docBase', 'Cancel');
    if (pick !== 'Select docBase') { return null; }

    // [Item 2] selectDocBase returns the config string (may contain ${workspaceFolder})
    const selectedDocBaseConfig = await vscode.commands.executeCommand<string>('happy-spring-tomcat.selectDocBase');
    if (!selectedDocBaseConfig) { return null; }

    // Resolve ${workspaceFolder} to get an absolute path for this run
    return selectedDocBaseConfig.replace(/\$\{workspaceFolder\}/g, projectRoot);
}
