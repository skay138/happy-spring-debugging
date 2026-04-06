import * as fs from 'fs';
import * as path from 'path';

/**
 * Validates that the given directory is a valid Tomcat installation.
 */
export function validateTomcatHome(tomcatHome: string): { valid: boolean; reason?: string } {
    if (!tomcatHome) {
        return { valid: false, reason: 'Tomcat Home path is empty.' };
    }
    if (!fs.existsSync(tomcatHome)) {
        return { valid: false, reason: `Directory does not exist: ${tomcatHome}` };
    }

    const binDir = path.join(tomcatHome, 'bin');
    const confDir = path.join(tomcatHome, 'conf');
    const libDir = path.join(tomcatHome, 'lib');

    if (!fs.existsSync(binDir) || !fs.existsSync(confDir)) {
        return { valid: false, reason: "Missing 'bin' or 'conf' directory. This doesn't look like a standard Tomcat installation." };
    }

    const serverXml = path.join(confDir, 'server.xml');
    if (!fs.existsSync(serverXml)) {
        return { valid: false, reason: "Missing 'conf/server.xml'. A valid Tomcat installation must have a default configuration." };
    }

    const catalinaJar = path.join(libDir, 'catalina.jar');
    if (!fs.existsSync(catalinaJar)) {
        const catalinaBat = path.join(binDir, 'catalina.bat');
        const catalinaSh = path.join(binDir, 'catalina.sh');
        if (!fs.existsSync(catalinaBat) && !fs.existsSync(catalinaSh)) {
            return { valid: false, reason: "Missing 'bin/catalina.bat' or 'bin/catalina.sh'. Cannot execute Tomcat." };
        }
    }

    return { valid: true };
}

/**
 * Gets the workspace-specific Tomcat runtime base directory from extension storage.
 */
export function getTomcatBaseDir(context: import('vscode').ExtensionContext): string | undefined {
    if (context.storageUri) {
        return path.join(context.storageUri.fsPath, 'tomcat-base');
    }
    return undefined;
}
