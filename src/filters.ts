import * as vscode from 'vscode';
import * as path from 'path';
import { minimatch } from 'minimatch';

function normalizeExtensions(extensions: string[]): string[] {
  return extensions.map(e =>
    e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`
  );
}

function extOf(uri: vscode.Uri): string {
  return path.extname(uri.fsPath).toLowerCase();
}

export function toRelativePath(uri: vscode.Uri): string {
  const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
  for (const folder of workspaceFolders) {
    const rel = path.relative(folder.uri.fsPath, uri.fsPath);
    if (!rel.startsWith('..')) {
      return rel.split(path.sep).join('/');
    }
  }
  return uri.fsPath.split(path.sep).join('/');
}

export function shouldInclude(uri: vscode.Uri): boolean {
  const config = vscode.workspace.getConfiguration('tokenCounter');
  const includeExtensions = normalizeExtensions(
    config.get<string[]>('includeExtensions', [])
  );
  const excludeExtensions = normalizeExtensions(
    config.get<string[]>('excludeExtensions', [])
  );
  const excludeGlobs = config.get<string[]>('excludeGlobs', []);

  const ext = extOf(uri);

  if (includeExtensions.length > 0 && !includeExtensions.includes(ext)) {
    return false;
  }

  if (excludeExtensions.includes(ext)) {
    return false;
  }

  const relPath = toRelativePath(uri);
  for (const pattern of excludeGlobs) {
    if (minimatch(relPath, pattern, { dot: true })) {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether a directory should be traversed during a folder count.
 * Checks a hypothetical child path against excludeGlobs so directories like
 * node_modules and .git are skipped entirely rather than collected and filtered.
 */
export function shouldTraverseDirectory(
  uri: vscode.Uri,
  excludeGlobs: string[]
): boolean {
  const relPath = toRelativePath(uri);
  // Test a hypothetical file inside the directory. If it would be excluded by
  // any glob, we skip traversing the directory altogether.
  const testPath = relPath + '/x';
  for (const pattern of excludeGlobs) {
    if (minimatch(testPath, pattern, { dot: true })) {
      return false;
    }
  }
  return true;
}
