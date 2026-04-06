import * as fs from 'fs';
import * as path from 'path';

/**
 * Searches for potential docBase directories in the workspace (containing WEB-INF/lib).
 */
export function findDocBaseCandidates(projectRoot: string): string[] {
    const candidates: string[] = [];
    const searchDirs = ['target', 'build', 'out', 'bin'];

    for (const dirName of searchDirs) {
        const searchPath = path.join(projectRoot, dirName);
        if (fs.existsSync(searchPath) && fs.statSync(searchPath).isDirectory()) {
            findWebInfLibRecursive(searchPath, candidates);
        }
    }
    return candidates;
}

function findWebInfLibRecursive(currentDir: string, candidates: string[]) {
    try {
        const items = fs.readdirSync(currentDir);

        const webInfPath = path.join(currentDir, 'WEB-INF');
        if (fs.existsSync(webInfPath) && fs.statSync(webInfPath).isDirectory()) {
            const libPath = path.join(webInfPath, 'lib');
            if (fs.existsSync(libPath)) {
                candidates.push(currentDir);
                return;
            }
        }

        for (const item of items) {
            if (['node_modules', '.git', '.vscode', 'test-classes', 'classes'].includes(item)) { continue; }

            const itemPath = path.join(currentDir, item);
            if (fs.statSync(itemPath).isDirectory()) {
                findWebInfLibRecursive(itemPath, candidates);
            }
        }
    } catch (e) {
        // Ignore read errors
    }
}
