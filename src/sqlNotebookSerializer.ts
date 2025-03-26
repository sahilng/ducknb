// file: src/sqlNotebookSerializer.ts
import * as vscode from 'vscode';

export class SqlNotebookSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    // Convert file bytes to string
    const fileStr = new TextDecoder().decode(content);

    // Attempt to parse JSON (or handle empty file gracefully)
    let data: any;
    try {
      data = JSON.parse(fileStr);
    } catch {
      data = { cells: [] };
    }

    // Convert to NotebookData
    const cells = data.cells?.map((rawCell: any) => {
      return new vscode.NotebookCellData(
        vscode.NotebookCellKind.Code,
        rawCell.value ?? '',        // The cell text
        rawCell.language ?? 'sql'   // The language id
      );      
    }) || [];

    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    // Transform notebook cells into JSON
    const contents = {
      cells: data.cells.map((cell) => ({
        language: cell.languageId,
        value: cell.value
      }))
    };

    // Return bytes
    return new TextEncoder().encode(JSON.stringify(contents, null, 2));
  }
}