import * as vscode from 'vscode';

export type CountTarget =
  | { kind: 'file'; uri: vscode.Uri }
  | { kind: 'directory'; uri: vscode.Uri };

export interface CountResult {
  totalTokens: number;
  filesCounted: number;
  filesSkipped: number;
}
