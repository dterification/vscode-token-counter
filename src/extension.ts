import * as vscode from 'vscode';
import { TokenCounterController } from './controller';

export function activate(context: vscode.ExtensionContext): void {
  const controller = new TokenCounterController();

  context.subscriptions.push(
    controller,

    vscode.commands.registerCommand(
      'tokenCounter.countActiveFile',
      () => controller.countActiveFile()
    ),

    vscode.commands.registerCommand(
      'tokenCounter.countUri',
      (uri: vscode.Uri) => controller.countUri(uri)
    ),

    vscode.commands.registerCommand(
      'tokenCounter.recountLastTarget',
      () => controller.recountLastTarget()
    ),

    vscode.window.onDidChangeActiveTextEditor(
      editor => controller.onActiveEditorChanged(editor)
    )
  );

  // Count the file that is already open when the extension activates
  if (vscode.window.activeTextEditor) {
    controller.onActiveEditorChanged(vscode.window.activeTextEditor);
  }
}

export function deactivate(): void {}
