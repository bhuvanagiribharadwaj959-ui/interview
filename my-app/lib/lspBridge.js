/**
 * LSP Bridge - Language Server Protocol integration
 * Connects Monaco Editor to Language Server via WebSocket
 */

import { MonacoLanguageClient } from 'monaco-languageclient';
import { CloseAction, ErrorAction } from 'vscode-languageserver-protocol';
import { toSocket, WebSocketMessageReader, WebSocketMessageWriter } from 'vscode-ws-jsonrpc';
import 'vscode/localExtensionHost';
import { ensureMonacoVscodeServicesReady } from './monacoVscodeBootstrap';

/**
 * Create and connect LSP client via WebSocket
 */
export async function createLanguageClient(websocketUrl, language) {
  try {
    await ensureMonacoVscodeServicesReady();

    const webSocket = new WebSocket(websocketUrl);

    return new Promise((resolve, reject) => {
      let settled = false;

      const resolveOnce = (value) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };

      const rejectOnce = (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      };

      webSocket.onopen = async () => {
        try {
          const socket = toSocket(webSocket);
          const reader = new WebSocketMessageReader(socket);
          const writer = new WebSocketMessageWriter(socket);

          const client = new MonacoLanguageClient({
            id: language,
            name: `${language} Language Client`,
            clientOptions: {
              documentSelector: [language],
              initializationOptions: { language },
              errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart }),
              },
            },
            messageTransports: { reader, writer },
          });

          await client.start();
          resolveOnce(client);
        } catch (error) {
          rejectOnce(error);
        }
      };

      webSocket.onerror = () => rejectOnce(new Error('WebSocket connection error'));
      webSocket.onclose = () => rejectOnce(new Error('WebSocket closed'));
    });
  } catch (error) {
    console.error('Failed to create language client:', error);
    throw error;
  }
}

/**
 * Diagnose LSP connection status
 */
export function checkLSPStatus(client) {
  if (!client) return { connected: false, reason: 'No client instance' };
  
  try {
    const state = client.getState?.();
    return {
      connected: state === 'running',
      state,
      capabilities: client.serverCapabilities || {},
    };
  } catch (e) {
    return { connected: false, reason: e.message };
  }
}

/**
 * Configure language-specific server options
 */
export function getLanguageServerConfig(language) {
  const configs = {
    python: {
      serverCapabilities: {
        completionProvider: { resolveProvider: true, triggerCharacters: ['.'] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        codeActionProvider: true,
        diagnosticProvider: true,
      },
      initializationOptions: {
        maxNumberOfProblems: 100,
        preferences: {
          formatOnType: true,
          formatOnSave: true,
        },
      },
    },
    javascript: {
      serverCapabilities: {
        completionProvider: { resolveProvider: true, triggerCharacters: ['.', '/', '@'] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        implementationProvider: true,
        typeDefinitionProvider: true,
        codeActionProvider: true,
        renameProvider: true,
        diagnosticProvider: true,
      },
    },
    typescript: {
      serverCapabilities: {
        completionProvider: { resolveProvider: true, triggerCharacters: ['.', '/', '@'] },
        hoverProvider: true,
        definitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        implementationProvider: true,
        typeDefinitionProvider: true,
        codeActionProvider: true,
        renameProvider: true,
        diagnosticProvider: true,
      },
    },
  };

  return configs[language] || configs.javascript;
}

/**
 * Handle diagnostics from LSP server
 */
export function handleDiagnostics(diagnostics, editor) {
  if (!editor || !diagnostics) return;

  const markers = diagnostics.map((diag) => ({
    startLineNumber: diag.range.start.line + 1,
    startColumn: diag.range.start.character + 1,
    endLineNumber: diag.range.end.line + 1,
    endColumn: diag.range.end.character + 1,
    message: diag.message,
    severity: diag.severity === 1 ? 8 : diag.severity === 2 ? 4 : 2,
    code: diag.code,
    source: diag.source,
  }));

  const model = editor.getModel();
  if (model) {
    const monaco = editor._standaloneServices;
    monaco.getMarkerService().changeOne('owner', model.uri, markers);
  }
}

/**
 * Disconnect LSP client gracefully
 */
export async function disconnectLanguageClient(client) {
  if (client) {
    try {
      await client.stop();
    } catch (error) {
      console.warn('Error disconnecting language client:', error);
    }
  }
}
