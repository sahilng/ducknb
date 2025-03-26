import * as vscode from 'vscode';
import { DuckDBInstance } from '@duckdb/node-api';
import { SqlNotebookSerializer } from './sqlNotebookSerializer';

// Store DuckDB instance and connection per notebook document
const duckdbInstances = new WeakMap<vscode.NotebookDocument, { instance: any, connection: any }>();

export async function activate(context: vscode.ExtensionContext) {
  // Register the notebook serializer
  vscode.workspace.registerNotebookSerializer('sql-notebook', new SqlNotebookSerializer());

  // Create a DuckDB instance per notebook when it opens
  vscode.workspace.onDidOpenNotebookDocument(async (notebook) => {
    if (notebook.notebookType === 'sql-notebook') {
      const instance = await DuckDBInstance.create(':memory:');
      const connection = await instance.connect();
      duckdbInstances.set(notebook, { instance, connection });
    }
  });

  // Clean up the DuckDB instance when the notebook is closed
  vscode.workspace.onDidCloseNotebookDocument(async (notebook) => {
    if (notebook.notebookType === 'sql-notebook') {
      const duckdb = duckdbInstances.get(notebook);
      if (duckdb) {
        try {
          await duckdb.connection.close();
          // If DuckDBInstance has a close method, call it as well:
          // await duckdb.instance.close();
        } catch (err) {
          console.error("Error closing DuckDB connection", err);
        }
        duckdbInstances.delete(notebook);
      }
    }
  });

  // Create your notebook controller
  const controller = vscode.notebooks.createNotebookController(
    'sql-notebook-controller', // controller id
    'sql-notebook',            // notebook type (must match package.json contribution)
    'SQL Notebook Controller'
  );
  controller.supportedLanguages = ['sql'];

  // Utility function to convert array of row objects into a minimal HTML table
  function rowsToHTML(rows: any[][], colNames: string[]): string {
    if (!rows.length) {
      return "<p>No rows returned.</p>";
    }
  
    let html = "<table border='1' style='border-collapse: collapse;'>";
    
    // Table header
    html += "<thead><tr>";
    for (const col of colNames) {
      html += `<th>${escapeHtml(col)}</th>`;
    }
    html += "</tr></thead>";
  
    // Table body
    html += "<tbody>";
    for (const row of rows) {
      html += "<tr>";
      for (const cell of row) {
        html += `<td>${escapeHtml(String(cell))}</td>`;
      }
      html += "</tr>";
    }
    html += "</tbody></table>";
  
    return html;
  }
  
  // Simple helper to avoid HTML injection
  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  


  // Use async/await for executing queries
  controller.executeHandler = async (cells, notebook, _controller) => {
    const duckdb = duckdbInstances.get(notebook);
    if (!duckdb) {
      vscode.window.showErrorMessage("DuckDB instance not found for this notebook.");
      return;
    }
    const { connection } = duckdb;
  
    for (const cell of cells) {
      const execution = controller.createNotebookCellExecution(cell);
      execution.start(Date.now());
      const query = cell.document.getText();
  
      try {
        // 1. Execute the query and get a "reader"
        const reader = await connection.runAndReadAll(query);
  
        // 2. Grab column names and row data
        const colNames = reader.columnNames();
        const rows = reader.getRows(); // array of arrays
  
        // 3. Convert to HTML
        const html = rowsToHTML(rows, colNames);
  
        // 4. Output the HTML table
        execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(html, 'text/html')
          ])
        ]);
        execution.end(true, Date.now());
      } catch (err: any) {
        execution.replaceOutput([
          new vscode.NotebookCellOutput([
            vscode.NotebookCellOutputItem.text(`Error: ${err.message}`, 'text/plain')
          ])
        ]);
        execution.end(false, Date.now());
      }
    }
  };
  

  context.subscriptions.push(controller);
}
