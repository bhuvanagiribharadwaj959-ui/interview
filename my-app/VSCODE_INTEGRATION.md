# VS Code Integration Guide

This editor implements complete VS Code-style features including themes, syntax highlighting, and LSP support.

## Architecture

### Components

1. **Monaco Editor** - The visual code editor engine (from VS Code)
2. **Theme Manager** - Handles color schemes and user preferences
3. **LSP Bridge** - Language Server Protocol integration for advanced language features
4. **WebSocket Connection** - Real-time communication with language servers

## Color System

### Available Themes

- **VS Code Dark** (default) - Microsoft's official dark theme
- **VS Code Light** - Microsoft's official light theme  
- **One Dark** - Popular Atom-inspired dark theme
- **Dracula** - High-contrast dark theme

### Changing Themes

Themes can be changed via the theme selector dropdown in the top bar. The selection is automatically saved to localStorage.

### Customizing Colors

To customize colors, edit the theme definitions in `lib/themeManager.js`:

```javascript
export const CUSTOM_THEME = {
  'editor.background': '#1e1e1e',
  'editor.foreground': '#d4d4d4',
  'keyword': '#569cd6',
  'string': '#ce9178',
  'comment': '#6a9955',
  // ... more colors
};
```

### CSS Variables

All theme colors are also available as CSS variables for use in your components:

```css
background-color: var(--color-editor.background);
color: var(--color-editor.foreground);
border-color: var(--color-input.border);
```

## Syntax Highlighting

Syntax highlighting follows VS Code's token classification system:

```javascript
// Keywords
token: 'keyword'
token: 'keyword.control'
token: 'keyword.operator'

// Strings and escapes
token: 'string'
token: 'string.escape'

// Comments
token: 'comment'
token: 'comment.line'
token: 'comment.block'

// Variables and identifiers
token: 'variable'
token: 'identifier'

// Functions and classes
token: 'entity.name.function'
token: 'entity.name.class'

// Types, numbers, operators
token: 'type'
token: 'number'
token: 'operator'
```

## Language Server Protocol (LSP)

### Supported Features

The LSP bridge provides:

- **Code Completion** - Intelligent suggestions based on context
- **Hover Information** - Type hints and documentation
- **Go to Definition** - Navigate to symbol definitions
- **Find References** - Locate all uses of a symbol
- **Diagnostics** - Real-time error and warning detection
- **Code Actions** - Quick fixes and refactoring
- **Symbol Search** - Find symbols in the document or workspace
- **Formatting** - Auto-format code on save or demand

### Configuration

Language server options are configured per-language in `getLanguageServerConfig()`:

```javascript
{
  python: { /* Python-specific LSP config */ },
  javascript: { /* JavaScript-specific LSP config */ },
  typescript: { /* TypeScript-specific LSP config */ },
}
```

### WebSocket Connection

The LSP bridge communicates with language servers over WebSocket:

```javascript
const client = await createLanguageClient(
  'ws://localhost:3000/lsp',
  'python'
);
```

## Monaco Editor Configuration

### Editor Options

Configured in `editorOptions`:

```javascript
{
  automaticLayout: true,
  fontSize: 14,
  fontFamily: 'Consolas, Monaco, Courier New, monospace',
  suggest: { /* suggestion settings */ },
  quickSuggestions: { /* quick suggestion settings */ },
  minimap: { enabled: false },
  wordBasedSuggestions: true,
  snippetSuggestions: 'top',
  semanticHighlighting: { enabled: true },
}
```

### Customization

To modify editor behavior, update the `editorOptions` useMemo in `pages/text_editor.js`.

## Color Reference

### Editor Colors

| Variable | VS Code Dark | Purpose |
|----------|--------------|---------|
| editor.background | #1e1e1e | Main editor background |
| editor.foreground | #d4d4d4 | Default text color |
| editorLineNumber.foreground | #858585 | Line number color |
| editor.selectionBackground | #264f78 | Selection highlight |
| editorCursor.foreground | #aeafad | Cursor color |

### Syntax Colors

| Token | VS Code Dark | Purpose |
|-------|--------------|---------|
| keyword | #569cd6 | Keywords (if, for, class, etc.) |
| string | #ce9178 | String literals |
| comment | #6a9955 | Comments |
| variable | #9cdcfe | Variable names |
| function | #dcdcaa | Function names |
| class | #4ec9b0 | Class names |
| number | #b5cea8 | Numeric literals |

### UI Colors

| Variable | VS Code Dark | Purpose |
|----------|--------------|---------|
| button.background | #0e639c | Button background |
| input.background | #3c3c3c | Input field background |
| statusBar.background | #007acc | Status bar background |
| terminal.foreground | #cccccc | Terminal text |

## Using with Custom Language Servers

To add a custom language server:

1. **Start a Language Server** that speaks LSP over WebSocket
2. **Update `lspBridge.js`** to add configuration for your language
3. **Create or update language definitions** in Monaco for syntax highlighting
4. **Test** by switching to the language in the editor

Example:

```javascript
// In getLanguageServerConfig()
customlang: {
  serverCapabilities: {
    completionProvider: { triggerCharacters: ['.'] },
    hoverProvider: true,
    definitionProvider: true,
  },
}
```

## Theme Application Flow

1. **Load** → Theme preference loaded from localStorage (default: vs-code-dark)
2. **Parse** → Get theme colors from `getTheme()`
3. **Apply** → Call `applyMonacoTheme()` to apply to Monaco
4. **CSS** → Call `applyCSSVariables()` to expose as CSS variables
5. **Persist** → Save preference to localStorage on change

## Troubleshooting

### Colors not updating
- Ensure `applyCSSVariables()` is called after theme change
- Check that Monaco editor instance is available before applying theme
- Clear localStorage if theme appears stuck: `localStorage.clear()`

### LSP not working
- Check WebSocket connection is open
- Verify language server is running and accessible
- Check browser console for connection errors
- Monitor network tab for WebSocket messages

### Syntax highlighting not showing
- Verify language is correctly detected
- Check that token rules match your language's tokenizer
- Ensure theme color values are valid hex colors

## Files

- `lib/themeManager.js` - Theme definitions and application logic
- `lib/lspBridge.js` - LSP client and configuration
- `pages/text_editor.js` - Main editor component
- `styles/globals.css` - Global styles with theme CSS variables

## Dependencies

- `@monaco-editor/react` - React wrapper for Monaco Editor
- `monaco-editor` - Monaco Editor library
- `monaco-languageclient` - LSP client for Monaco
- `vscode-ws-jsonrpc` - WebSocket JSON-RPC protocol handler
- `vscode-languageserver` - Language Server Protocol definitions

