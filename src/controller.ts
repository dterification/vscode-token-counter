import * as vscode from 'vscode';
import { CountTarget, CountResult } from './types';
import { createTokenizer } from './tokenizer';
import { countTarget } from './counter';

export class TokenCounterController implements vscode.Disposable {
  private readonly statusBar: vscode.StatusBarItem;
  private lastTarget: CountTarget | undefined;
  private debounceTimer: NodeJS.Timeout | undefined;
  private currentCts: vscode.CancellationTokenSource | undefined;

  constructor() {
    this.statusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBar.text = '$(symbol-number) Tokens: --';
    this.statusBar.tooltip = 'Token Counter — click to recount';
    this.statusBar.command = 'tokenCounter.recountLastTarget';
    this.statusBar.show();
  }

  async countActiveFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    await this.runCount({ kind: 'file', uri: editor.document.uri });
  }

  async countUri(uri: vscode.Uri): Promise<void> {
    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      return;
    }
    const target: CountTarget =
      (stat.type & vscode.FileType.Directory) === vscode.FileType.Directory
        ? { kind: 'directory', uri }
        : { kind: 'file', uri };
    await this.runCount(target);
  }

  async recountLastTarget(): Promise<void> {
    if (this.lastTarget) {
      await this.runCount(this.lastTarget);
    }
  }

  onActiveEditorChanged(editor: vscode.TextEditor | undefined): void {
    const config = vscode.workspace.getConfiguration('tokenCounter');
    if (!config.get<boolean>('countOnFocus', true)) {
      return;
    }
    if (!editor) {
      return;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    const uri = editor.document.uri;
    this.debounceTimer = setTimeout(() => {
      this.runCount({ kind: 'file', uri }).catch(() => {
        /* swallow — runCount handles its own errors */
      });
    }, 300);
  }

  private async runCount(target: CountTarget): Promise<void> {
    // Cancel any in-progress count before starting a new one
    if (this.currentCts) {
      this.currentCts.cancel();
      this.currentCts.dispose();
    }
    this.currentCts = new vscode.CancellationTokenSource();
    const token = this.currentCts.token;

    this.lastTarget = target;
    this.setStatusCounting();

    try {
      const config = vscode.workspace.getConfiguration('tokenCounter');
      const model = config.get<string>('model', 'gpt-4o');
      const maxFileSizeKB = config.get<number>('maxFileSizeKB', 512);
      const tokenizer = createTokenizer(model);
      const result = await countTarget(target, tokenizer, maxFileSizeKB, token);
      if (!token.isCancellationRequested) {
        this.setStatusResult(result, tokenizer.modelLabel);
      }
    } catch (err) {
      if (!token.isCancellationRequested) {
        this.setStatusError();
        vscode.window.showErrorMessage(`Token Counter: ${String(err)}`);
      }
    } finally {
      if (this.currentCts?.token === token) {
        this.currentCts.dispose();
        this.currentCts = undefined;
      }
    }
  }

  private setStatusCounting(): void {
    this.statusBar.text = '$(loading~spin) Tokens: ...';
    this.statusBar.tooltip = 'Counting tokens…';
  }

  private setStatusResult(result: CountResult, model: string): void {
    const count = result.totalTokens.toLocaleString();
    this.statusBar.text = `$(symbol-number) ${count} tok`;
    this.statusBar.tooltip = [
      `Tokens: ${count}`,
      `Model: ${model}`,
      `Files counted: ${result.filesCounted}`,
      `Files skipped: ${result.filesSkipped}`,
      '',
      'Click to recount last target',
    ].join('\n');
  }

  private setStatusError(): void {
    this.statusBar.text = '$(warning) Tokens: err';
    this.statusBar.tooltip = 'Token Counter encountered an error — click to retry';
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    if (this.currentCts) {
      this.currentCts.cancel();
      this.currentCts.dispose();
    }
    this.statusBar.dispose();
  }
}
