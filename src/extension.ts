import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('tomcat-debug-setup.setup', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open. Please open a project first.');
            return;
        }

        const projectRoot = workspaceFolders[0].uri.fsPath;
        const vscodeDir = path.join(projectRoot, '.vscode');

        // Create .vscode directory if it doesn't exist
        if (!fs.existsSync(vscodeDir)) {
            fs.mkdirSync(vscodeDir, { recursive: true });
        }

        // Read configuration from settings
        const config = vscode.workspace.getConfiguration('tomcatDebugSetup');
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

        if (!tomcatHome) {
            const selectedHome = await vscode.commands.executeCommand<string>('tomcat-debug-setup.selectTomcatHome');
            if (selectedHome) {
                tomcatHome = selectedHome;
            } else {
                return; // User cancelled
            }
        }

        const resolvedDocBase = docBase.replace(/\$\{workspaceFolder\}/g, projectRoot);
        if (!fs.existsSync(resolvedDocBase)) {
            const pick = await vscode.window.showInformationMessage(`docBase [${docBase}] does not exist. Would you like to select it?`, 'Yes', 'No');
            if (pick === 'Yes') {
                const selectedDocBase = await vscode.commands.executeCommand<string>('tomcat-debug-setup.selectDocBase');
                if (selectedDocBase) {
                    // Refresh resolvedDocBase after selection
                    const refreshedDocBase = selectedDocBase.replace(/\$\{workspaceFolder\}/g, projectRoot);
                    if (refreshedDocBase !== resolvedDocBase) {
                        // Re-run setup to use new docBase
                        vscode.commands.executeCommand('tomcat-debug-setup.setup');
                        return;
                    }
                }
            }
        }

        const validation = validateTomcatHome(tomcatHome);
        if (!validation.valid) {
            vscode.window.showErrorMessage(`Invalid Tomcat Home: ${validation.reason}`);
            return;
        }

        // --- Setup .vscode/tomcat-debug-setup/ ---
        const extensionDir = path.join(vscodeDir, 'tomcat-debug-setup');
        if (!fs.existsSync(extensionDir)) {
            fs.mkdirSync(extensionDir, { recursive: true });
        }

        const tomcatBaseDir = path.join(extensionDir, 'tomcat-base');
        const confDir = path.join(tomcatBaseDir, 'conf');
        const sourceConfDir = path.join(tomcatHome, 'conf');

        if (!fs.existsSync(tomcatBaseDir)) {
            fs.mkdirSync(tomcatBaseDir, { recursive: true });
        }
        
        // Copy conf directory
        fs.cpSync(sourceConfDir, confDir, { recursive: true });

        // Create requisite Tomcat directories
        ['logs', 'temp', 'work', 'webapps'].forEach(dir => {
            const dirPath = path.join(tomcatBaseDir, dir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath);
            }
        });

        // Parse and modify server.xml - only change HTTP port, do NOT inject Context here
        const serverXmlPath = path.join(confDir, 'server.xml');
        if (fs.existsSync(serverXmlPath)) {
            let serverXml = fs.readFileSync(serverXmlPath, 'utf8');
            // Change port: regex replacement for HTTP connector (Avoid modifying AJP connector)
            serverXml = serverXml.replace(/(<Connector[^>]*?)port="\d+"([^>]*?protocol="HTTP\/1\.1")/g, `$1port="${httpPort}"$2`);
            fs.writeFileSync(serverXmlPath, serverXml, 'utf8');
        }

        // --- conf/Catalina/localhost/[contextname].xml ---
        // This approach allows Tomcat to merge with the app's META-INF/context.xml automatically
        const catalinaHostDir = path.join(confDir, 'Catalina', 'localhost');
        if (fs.existsSync(catalinaHostDir)) {
            // Clear old context files to avoid duplicates (e.g. if contextPath changed)
            fs.rmSync(catalinaHostDir, { recursive: true, force: true });
        }
        fs.mkdirSync(catalinaHostDir, { recursive: true });

        // Derive context file name from contextPath
        // /          → ROOT.xml
        // /example   → example.xml
        // /a/b       → a#b.xml  (Tomcat uses # for nested paths)
        const resolvedSourceBase = sourceBase.replace(/\$\{workspaceFolder\}/g, projectRoot);
        const resolvedClassesBase = classesBase.replace(/\$\{workspaceFolder\}/g, projectRoot);

        const contextFileName = (contextPath === '/' || contextPath === '')
            ? 'ROOT.xml'
            : contextPath.replace(/^\//, '').replace(/\//g, '#') + '.xml';
        const contextFilePath = path.join(catalinaHostDir, contextFileName);

        // Build PreResources block for hot reload
        let preResourcesXml = '';
        if (resolvedSourceBase || resolvedClassesBase) {
            const preResList: string[] = [];
            if (resolvedSourceBase) {
                preResList.push(`        <PreResources className="org.apache.catalina.webresources.DirResourceSet"\n                      base="${resolvedSourceBase}"\n                      webAppMount="/" />`);
            }
            if (resolvedClassesBase) {
                preResList.push(`        <PreResources className="org.apache.catalina.webresources.DirResourceSet"\n                      base="${resolvedClassesBase}"\n                      webAppMount="/WEB-INF/classes" />`);
            }
            preResourcesXml = `\n    <!-- Source Folder Mapping for Hot Reload -->\n    <Resources cachingAllowed="false" trackLockedFiles="true">\n${preResList.join('\n')}\n    </Resources>\n`;
        }

        // --- Read META-INF/context.xml from docBase (and fallback to sourceBase) ---
        // conf/Catalina/localhost/*.xml takes PRECEDENCE over META-INF/context.xml (not merged).
        // So we manually read its inner body and embed it into the generated context file.
        let metaInfContextBody = '';
        const metaInfCandidates = [
            path.join(resolvedDocBase, 'META-INF', 'context.xml'),
            path.join(resolvedSourceBase, 'META-INF', 'context.xml'),
        ];
        for (const candidate of metaInfCandidates) {
            if (fs.existsSync(candidate)) {
                const raw = fs.readFileSync(candidate, 'utf8');
                // Extract inner content between <Context...> and </Context>
                const innerMatch = raw.match(/<Context[^>]*>([\s\S]*?)<\/Context>/i);
                if (innerMatch && innerMatch[1].trim()) {
                    metaInfContextBody = `\n    <!-- From META-INF/context.xml: ${candidate} -->${innerMatch[1]}`;
                }
                break; // use first found
            }
        }

        // Build JNDI Resource elements from settings (supplemental, if not in META-INF/context.xml)
        let jndiResourcesXml = '';
        if (jndiResources && jndiResources.length > 0) {
            const resourceElements = jndiResources.map((res: any) => {
                const attrs = Object.entries(res)
                    .map(([key, value]) => `${key}="${value}"`)
                    .join('\n               ');
                return `    <!-- JNDI DataSource (from settings) -->\n    <Resource ${attrs} />`;
            });
            jndiResourcesXml = '\n' + resourceElements.join('\n') + '\n';
        }

        const contextFileContent =
`<?xml version="1.0" encoding="UTF-8"?>
<!--
  Auto-generated by tomcat-debug-setup extension.
  NOTE: conf/Catalina/localhost/*.xml takes precedence over META-INF/context.xml.
  Contents of META-INF/context.xml are embedded below automatically.
-->
<Context docBase="${resolvedDocBase}"
         reloadable="false"
         clearReferencesObjectStreamClassCaches="false"
         clearReferencesThreadLocals="false">${preResourcesXml}${metaInfContextBody}${jndiResourcesXml}
</Context>
`;
        fs.writeFileSync(contextFilePath, contextFileContent, 'utf8');

        // --- Scripts Content ---
        const startBatPath = path.join(extensionDir, 'start-tomcat.bat');

        // Write colorize-logs.ps1 if colorizeLogs is enabled
        const colorizePs1Path = path.join(extensionDir, 'colorize-logs.ps1');
        const colorizePs1Content = `$currentColor = "White"
$esc = [char]27
$input | ForEach-Object {
    $line = $_ -replace "\\x1b\\[[0-9;]*m",""
    
    # Improved log entry detection (supports ISO, Tomcat default, and standard Java logging timestamps)
    $isNewEntry = $line -match '^(\\[?\\d{4}-\\d{2}-\\d{2}\\s|\\[?\\d{2}-\\w{3}-\\d{4}\\s|\\w{3}\\s\\d{2},\\s\\d{4})'
    
    if ($isNewEntry) {
        switch -Regex -CaseSensitive ($line) {
            '\\b(FATAL|CRITICAL)\\b' { $currentColor = "Magenta"; break }
            '\\b(ERROR|SEVERE)\\b|Exception\\b|Error\\b|심각' { $currentColor = "Red"; break }
            '\\b(WARN|WARNING|Potential)\\b|경고' { $currentColor = "Yellow"; break }
            '\\b(SQL|QUERY|sqltiming|HikariPool)\\b|Preparing:|Parameters:' { $currentColor = "DarkYellow"; break }
            '\\b(HTTP|REQUEST|RESPONSE|Mapping|Dispatching)\\b' { $currentColor = "Green"; break }
            '\\b(INFO|Started|Initializing)\\b|정보' { $currentColor = "Cyan"; break }
            '\\b(DEBUG|debug)\\b' { $currentColor = "Blue"; break }
            '\\b(TRACE|trace)\\b' { $currentColor = "DarkCyan"; break }
            default { $currentColor = "White" }
        }
        Write-Host $_ -ForegroundColor $currentColor
    } else {
        # Continuation line (stack traces, multi-line logs): dim (faded) with same color
        Write-Host "$esc[2m$_$esc[0m" -ForegroundColor $currentColor
    }
}`;
        fs.writeFileSync(colorizePs1Path, '\uFEFF' + colorizePs1Content, 'utf8');

        const catalinaRunLine = colorizeLogs
            ? `call "%CATALINA_HOME%\\bin\\catalina.bat" jpda run 2>&1 | powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0colorize-logs.ps1"`
            : `call "%CATALINA_HOME%\\bin\\catalina.bat" jpda run`;

        const startBatContent = `@echo off
chcp 65001 > nul
echo ====================================================
echo Starting Tomcat in DEBUG mode (Port ${debugPort})...
echo HTTP Port: ${httpPort}
echo Context Path: ${contextPath}
echo ====================================================

echo Cleaning up previous Tomcat instances...
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":${debugPort}"') DO (
    taskkill /F /PID %%T > nul 2>&1
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":${httpPort}"') DO (
    taskkill /F /PID %%T > nul 2>&1
)
timeout /t 1 /nobreak > nul

set "JAVA_OPTS=${javaOpts}"
set "CATALINA_HOME=${tomcatHome}"
set "CATALINA_BASE=%~dp0tomcat-base"
set "JPDA_ADDRESS=127.0.0.1:${debugPort}"

echo Tomcat is launching (HTTP Port ${httpPort})...
${catalinaRunLine}

echo Tomcat process exited.
`;

        const stopBatPath = path.join(extensionDir, 'stop-tomcat.bat');
        const stopBatContent = `@echo off
chcp 65001 > nul
echo ====================================================
echo Stopping Tomcat...
echo ====================================================

FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":${debugPort}"') DO (
    echo Killing debug port PID: %%T
    taskkill /F /PID %%T
)
FOR /F "tokens=5" %%T IN ('netstat -a -n -o ^| findstr "LISTENING" ^| findstr ":${httpPort}"') DO (
    echo Killing HTTP port PID: %%T
    taskkill /F /PID %%T
)
echo Tomcat stopped cleanly.
`;

        fs.writeFileSync(startBatPath, startBatContent, 'utf8');
        fs.writeFileSync(stopBatPath, stopBatContent, 'utf8');

        // --- tasks.json ---
        const tasksJsonPath = path.join(vscodeDir, 'tasks.json');
        let tasksJson: any = { version: "2.0.0", tasks: [] };
        if (fs.existsSync(tasksJsonPath)) {
            try {
                const content = fs.readFileSync(tasksJsonPath, 'utf8');
                // Removing comments to parse json safely in a simple way
                tasksJson = JSON.parse(content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
            } catch (e) {
                vscode.window.showErrorMessage('Could not parse existing tasks.json. Creating new configuration.');
            }
        }

        if (!tasksJson.tasks) tasksJson.tasks = [];
        
        // Update/Add Stop Tomcat Task
        const stopTaskIndex = tasksJson.tasks.findIndex((t:any) => t.label === 'Stop Tomcat');
        const stopTaskDef = {
            "label": "Stop Tomcat",
            "type": "shell",
            "command": "\${workspaceFolder}\\\\.vscode\\\\tomcat-debug-setup\\\\stop-tomcat.bat",
            "presentation": {
                "reveal": "silent",
                "panel": "shared",
                "close": true,
                "showReuseMessage": false
            }
        };
        if (stopTaskIndex >= 0) {
            tasksJson.tasks[stopTaskIndex] = stopTaskDef;
        } else {
            tasksJson.tasks.unshift(stopTaskDef);
        }

        // Update/Add Start Tomcat Task
        const startTaskIndex = tasksJson.tasks.findIndex((t:any) => t.label === 'Start Tomcat (JPDA)');
        const startTaskDef = {
            "label": "Start Tomcat (JPDA)",
            "type": "shell",
            "command": "\${workspaceFolder}\\\\.vscode\\\\tomcat-debug-setup\\\\start-tomcat.bat",
            "isBackground": true,
            "problemMatcher": {
                "pattern": { "regexp": "^$" },
                "background": {
                    "activeOnStart": true,
                    "beginsPattern": "Starting Tomcat",
                    "endsPattern": "Server startup in"
                }
            },
            "presentation": {
                "reveal": "always",
                "panel": "dedicated",
                "group": "tomcat",
                "showReuseMessage": false
            }
        };
        if (startTaskIndex >= 0) {
            tasksJson.tasks[startTaskIndex] = startTaskDef;
        } else {
            tasksJson.tasks.push(startTaskDef);
        }

        fs.writeFileSync(tasksJsonPath, JSON.stringify(tasksJson, null, 4), 'utf8');

        // --- launch.json ---
        const launchJsonPath = path.join(vscodeDir, 'launch.json');
        let launchJson: any = { version: "0.2.0", configurations: [] };
        if (fs.existsSync(launchJsonPath)) {
            try {
                const content = fs.readFileSync(launchJsonPath, 'utf8');
                launchJson = JSON.parse(content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, ''));
            } catch(e) {}
        }
        
        if (!launchJson.configurations) launchJson.configurations = [];

        const launchName = "🚀 Tomcat — Attach Debug";
        const launchConfigIndex = launchJson.configurations.findIndex((c:any) => c.name === launchName);
        const launchConfigDef = {
            "type": "java",
            "name": launchName,
            "request": "attach",
            "hostName": "localhost",
            "port": debugPort,
            "preLaunchTask": "Start Tomcat (JPDA)",
            "postDebugTask": "Stop Tomcat",
            "internalConsoleOptions": "neverOpen"
        };
        
        if (launchConfigIndex >= 0) {
            launchJson.configurations[launchConfigIndex] = launchConfigDef;
        } else {
            launchJson.configurations.push(launchConfigDef);
        }

        fs.writeFileSync(launchJsonPath, JSON.stringify(launchJson, null, 4), 'utf8');

        // Inform user
        vscode.window.showInformationMessage('Tomcat Debug Scripts have been successfully configured in .vscode!');
    });

    context.subscriptions.push(disposable);

    // Register Select Tomcat Home command
    let selectTomcatHomeDisposable = vscode.commands.registerCommand('tomcat-debug-setup.selectTomcatHome', async () => {
        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Tomcat Home Directory'
        });

        if (selectedFolder && selectedFolder[0]) {
            const tomcatHome = selectedFolder[0].fsPath;
            
            const validation = validateTomcatHome(tomcatHome);
            if (!validation.valid) {
                vscode.window.showErrorMessage(`Selected path is not a valid Tomcat Home: ${validation.reason}`);
                return undefined;
            }

            const config = vscode.workspace.getConfiguration('tomcatDebugSetup');
            await config.update('tomcatHome', tomcatHome, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Tomcat Home set to: ${tomcatHome}`);
            return tomcatHome;
        }
        return undefined;
    });
    context.subscriptions.push(selectTomcatHomeDisposable);

    // Register Select docBase command
    let selectDocBaseDisposable = vscode.commands.registerCommand('tomcat-debug-setup.selectDocBase', async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return undefined;
        const projectRoot = workspaceFolders[0].uri.fsPath;

        const selectedFolder = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Webapp docBase Directory'
        });

        if (selectedFolder && selectedFolder[0]) {
            let docBase = selectedFolder[0].fsPath;
            
            // If inside workspace, convert to ${workspaceFolder}
            if (docBase.startsWith(projectRoot)) {
                docBase = docBase.replace(projectRoot, '${workspaceFolder}').replace(/\\/g, '/');
            }

            const config = vscode.workspace.getConfiguration('tomcatDebugSetup');
            await config.update('docBase', docBase, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`docBase set to: ${docBase}`);
            return docBase;
        }
        return undefined;
    });
    context.subscriptions.push(selectDocBaseDisposable);

    // Add configuration change listener
    let configListener = vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('tomcatDebugSetup')) {
            vscode.window.showInformationMessage('Tomcat settings changed. Would you like to regenerate the debug scripts?', 'Yes', 'No')
                .then(selection => {
                    if (selection === 'Yes') {
                        vscode.commands.executeCommand('tomcat-debug-setup.setup');
                    }
                });
        }
    });
    context.subscriptions.push(configListener);
}

export function deactivate() {}

function validateTomcatHome(tomcatHome: string): { valid: boolean, reason?: string } {
    if (!tomcatHome) {
        return { valid: false, reason: 'Tomcat Home path is empty.' };
    }
    if (!fs.existsSync(tomcatHome)) {
        return { valid: false, reason: `Directory does not exist: ${tomcatHome}` };
    }

    const binDir = path.join(tomcatHome, 'bin');
    const confDir = path.join(tomcatHome, 'conf');
    const libDir = path.join(tomcatHome, 'lib');
    
    // Check for essential Tomcat directories
    if (!fs.existsSync(binDir) || !fs.existsSync(confDir)) {
        return { valid: false, reason: "Missing 'bin' or 'conf' directory. This doesn't look like a standard Tomcat installation." };
    }

    // Check for server.xml
    const serverXml = path.join(confDir, 'server.xml');
    if (!fs.existsSync(serverXml)) {
        return { valid: false, reason: "Missing 'conf/server.xml'. A valid Tomcat installation must have a default configuration." };
    }

    // Check for catalina.jar in lib (most common marker)
    const catalinaJar = path.join(libDir, 'catalina.jar');
    if (!fs.existsSync(catalinaJar)) {
        // Some slim versions might differ, but catalina.jar is almost always there.
        // We'll allow it but warn if we're being strict. For now, let's keep it as a soft check or just check bin/catalina.bat
        const catalinaBat = path.join(binDir, 'catalina.bat');
        const catalinaSh = path.join(binDir, 'catalina.sh');
        if (!fs.existsSync(catalinaBat) && !fs.existsSync(catalinaSh)) {
            return { valid: false, reason: "Missing 'bin/catalina.bat' or 'bin/catalina.sh'. Cannot execute Tomcat." };
        }
    }

    return { valid: true };
}
