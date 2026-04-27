import * as vscode from 'vscode';
import { CountTarget, CountResult } from './types';
import { Tokenizer } from './tokenizer';
import { shouldInclude, shouldTraverseDirectory } from './filters';

export async function countTarget(
  target: CountTarget,
  tokenizer: Tokenizer,
  maxFileSizeKB: number,
  token: vscode.CancellationToken
): Promise<CountResult> {
  if (target.kind === 'file') {
    return countFile(target.uri, tokenizer, maxFileSizeKB, token);
  }
  return countDirectory(target.uri, tokenizer, maxFileSizeKB, token);
}

async function countFile(
  uri: vscode.Uri,
  tokenizer: Tokenizer,
  maxFileSizeKB: number,
  token: vscode.CancellationToken
): Promise<CountResult> {
  if (token.isCancellationRequested) {
    return { totalTokens: 0, filesCounted: 0, filesSkipped: 0 };
  }

  if (!shouldInclude(uri)) {
    return { totalTokens: 0, filesCounted: 0, filesSkipped: 1 };
  }

  try {
    if (maxFileSizeKB > 0) {
      const stat = await vscode.workspace.fs.stat(uri);
      if (stat.size > maxFileSizeKB * 1024) {
        return { totalTokens: 0, filesCounted: 0, filesSkipped: 1 };
      }
    }

    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = new TextDecoder('utf-8').decode(bytes);
    const totalTokens = tokenizer.count(text);

    return { totalTokens, filesCounted: 1, filesSkipped: 0 };
  } catch {
    return { totalTokens: 0, filesCounted: 0, filesSkipped: 1 };
  }
}

async function collectFiles(
  uri: vscode.Uri,
  excludeGlobs: string[],
  token: vscode.CancellationToken
): Promise<vscode.Uri[]> {
  const files: vscode.Uri[] = [];

  if (token.isCancellationRequested) {
    return files;
  }

  let entries: [string, vscode.FileType][];
  try {
    entries = await vscode.workspace.fs.readDirectory(uri);
  } catch {
    return files;
  }

  for (const [name, fileType] of entries) {
    if (token.isCancellationRequested) {
      break;
    }

    const childUri = vscode.Uri.joinPath(uri, name);
    const isFile = (fileType & vscode.FileType.File) === vscode.FileType.File;
    const isDir =
      (fileType & vscode.FileType.Directory) === vscode.FileType.Directory;
    const isSymlink =
      (fileType & vscode.FileType.SymbolicLink) === vscode.FileType.SymbolicLink;

    if (isSymlink) {
      continue;
    }

    if (isFile) {
      files.push(childUri);
    } else if (isDir && shouldTraverseDirectory(childUri, excludeGlobs)) {
      const children = await collectFiles(childUri, excludeGlobs, token);
      files.push(...children);
    }
  }

  return files;
}

async function countDirectory(
  uri: vscode.Uri,
  tokenizer: Tokenizer,
  maxFileSizeKB: number,
  token: vscode.CancellationToken
): Promise<CountResult> {
  const config = vscode.workspace.getConfiguration('tokenCounter');
  const excludeGlobs = config.get<string[]>('excludeGlobs', []);

  const files = await collectFiles(uri, excludeGlobs, token);

  let totalTokens = 0;
  let filesCounted = 0;
  let filesSkipped = 0;

  for (const file of files) {
    if (token.isCancellationRequested) {
      break;
    }
    const result = await countFile(file, tokenizer, maxFileSizeKB, token);
    totalTokens += result.totalTokens;
    filesCounted += result.filesCounted;
    filesSkipped += result.filesSkipped;
  }

  return { totalTokens, filesCounted, filesSkipped };
}
