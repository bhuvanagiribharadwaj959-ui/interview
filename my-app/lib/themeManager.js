/**
 * Theme Manager - VS Code color system
 * Handles user colors and theme definitions
 */

// Default VS Code Dark Theme colors
export const VS_CODE_DARK_THEME = {
  // Editor colors
  'editor.background': '#000000',
  'editor.foreground': '#d4d4d4',
  'editor.lineNumbersBackground': '#000000',
  'editorLineNumber.foreground': '#858585',
  'editorLineNumber.activeForeground': '#c6c6c6',
  
  // Selection and cursor
  'editor.selectionBackground': '#264f78',
  'editor.inactiveSelectionBackground': '#3a3d41',
  'editor.selectionForeground': '#ffffff',
  'editorCursor.foreground': '#aeafad',
  'editor.lineHighlightBackground': '#2a2d2e',
  'editorCursorLine.background': '#2a2d2e',
  'editor.lineHighlightBorder': '#00000000',
  
  // UI elements
  'editorGroupHeader.tabsBackground': '#000000',
  'editorGroup.emptyBackground': '#000000',
  'tab.activeBackground': '#000000',
  'tab.inactiveBackground': '#2d2d30',
  'tab.border': '#3e3e42',
  'tab.activeForeground': '#ffffff',
  'tab.inactiveForeground': '#969696',
  'editorPane.background': '#000000',
  'editorWidget.background': '#252526',
  'editorWidget.border': '#454545',
  
  // Status bar
  'statusBar.background': '#007acc',
  'statusBar.foreground': '#ffffff',
  'statusBarItem.hoverBackground': '#1177bb',
  
  // Input and buttons
  'input.background': '#3c3c3c',
  'input.border': '#3e3e42',
  'input.foreground': '#cccccc',
  'input.placeholderForeground': '#a6a6a6',
  'button.background': '#0e639c',
  'button.foreground': '#ffffff',
  'button.hoverBackground': '#1177bb',
  
  // Terminal
  'terminal.background': '#1e1e1e',
  'terminal.foreground': '#cccccc',
  'terminal.ansiBlack': '#000000',
  'terminal.ansiRed': '#cd3131',
  'terminal.ansiGreen': '#0dbc79',
  'terminal.ansiYellow': '#e5e510',
  'terminal.ansiBlue': '#2b7bdb',
  'terminal.ansiMagenta': '#bc3fbc',
  'terminal.ansiCyan': '#11a8cd',
  'terminal.ansiWhite': '#e5e5e5',
  'terminal.ansiBrightBlack': '#666666',
  'terminal.ansiBrightRed': '#f14c4c',
  'terminal.ansiBrightGreen': '#23d18b',
  'terminal.ansiBrightYellow': '#f5f543',
  'terminal.ansiBrightBlue': '#3b8eea',
  'terminal.ansiBrightMagenta': '#d670d6',
  'terminal.ansiBrightCyan': '#29b8db',
  'terminal.ansiBrightWhite': '#ffffff',
  
  // Syntax colors
  'keyword': '#569cd6',
  'keyword.control': '#c586c0',
  'keyword.operator': '#d4d4d4',
  'string': '#ce9178',
  'string.escape': '#d7ba7d',
  'comment': '#6a9955',
  'variable': '#9cdcfe',
  'function': '#dcdcaa',
  'class': '#4ec9b0',
  'type': '#4ec9b0',
  'number': '#b5cea8',
  'constant': '#4fc1ff',
  'operator': '#d4d4d4',
  'tag': '#4ec9b0',
};

// VS Code Light Theme
export const VS_CODE_LIGHT_THEME = {
  'editor.background': '#ffffff',
  'editor.foreground': '#333333',
  'editor.lineNumbersBackground': '#f5f5f5',
  'editorLineNumber.foreground': '#7f7f7f',
  'editorLineNumber.activeForeground': '#000000',
  'editor.selectionBackground': '#add6ff',
  'editor.inactiveSelectionBackground': '#e5ebf1',
  'editorCursor.foreground': '#000000',
  'editor.lineHighlightBackground': '#f0f0f0',
  'editorCursorLine.background': '#f0f0f0',
  'editorGroupHeader.tabsBackground': '#f3f3f3',
  'tab.activeBackground': '#ffffff',
  'tab.inactiveBackground': '#ececec',
  'input.background': '#f5f5f5',
  'input.foreground': '#333333',
  'button.background': '#0066cc',
  'keyword': '#0000ff',
  'string': '#a31515',
  'comment': '#008000',
  'variable': '#001080',
  'function': '#795e26',
  'number': '#098658',
};

// Monitor theme configuration
export const ONEDARK_THEME = {
  'editor.background': '#282c34',
  'editor.foreground': '#abb2bf',
  'editorLineNumber.foreground': '#5c6370',
  'editorLineNumber.activeForeground': '#abb2bf',
  'editor.selectionBackground': '#3e4452',
  'editorCursor.foreground': '#528b5e',
  'keyword': '#c678dd',
  'string': '#98c379',
  'comment': '#5c6370',
  'variable': '#61afef',
  'function': '#61afef',
  'class': '#e5c07b',
  'number': '#d19a66',
};

export const DRACULA_THEME = {
  'editor.background': '#282a36',
  'editor.foreground': '#f8f8f2',
  'editorLineNumber.foreground': '#6272a4',
  'editorLineNumber.activeForeground': '#f8f8f2',
  'editor.selectionBackground': '#44475a',
  'editorCursor.foreground': '#f8f8f2',
  'keyword': '#ff79c6',
  'string': '#f1fa8c',
  'comment': '#6272a4',
  'variable': '#8be9fd',
  'function': '#50fa7b',
  'class': '#f1fa8c',
  'number': '#bd93f9',
};

/**
 * Apply theme colors to Monaco Editor
 */
export function applyMonacoTheme(monaco, themeName = 'vs-code-dark', customColors = {}) {
  const baseTheme = getTheme(themeName);
  const colors = { ...baseTheme, ...customColors };

  const theme = {
    base: themeName.includes('light') ? 'vs' : 'vs-dark',
    inherit: false,
    rules: getTokenRules(colors),
    colors: getEditorColors(colors),
  };

  try {
    monaco.editor.defineTheme('custom', theme);
    monaco.editor.setTheme('custom');
    
    // Apply semantic token colors through settings
    if (monaco.editor._themeService) {
      const semanticTokenRules = getSemanticTokenRules(colors);
      semanticTokenRules.forEach(([token, style]) => {
        const rule = { 'selector': token, 'settings': { ...style } };
      });
    }
  } catch (e) {
    console.warn('Theme definition error:', e);
  }
}

/**
 * Get theme by name
 */
export function getTheme(themeName = 'vs-code-dark') {
  const themes = {
    'vs-code-dark': VS_CODE_DARK_THEME,
    'vs-code-light': VS_CODE_LIGHT_THEME,
    'onedark': ONEDARK_THEME,
    'dracula': DRACULA_THEME,
  };
  
  return themes[themeName] || VS_CODE_DARK_THEME;
}

/**
 * Get token rules for syntax highlighting
 */
function getTokenRules(colors) {
  return [
    // Keywords - bold and blue/purple
    { token: 'keyword', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.control', foreground: colors['keyword.control']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.operator', foreground: colors['keyword.operator']?.replace('#', '') },
    { token: 'keyword.import', foreground: colors['keyword.control']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.export', foreground: colors['keyword.control']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.def', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.class', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.return', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.if', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.else', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.for', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.while', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.try', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.except', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'keyword.finally', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    
    // Strings - orange/red
    { token: 'string', foreground: colors['string']?.replace('#', '') },
    { token: 'string.quoted', foreground: colors['string']?.replace('#', '') },
    { token: 'string.quoted.single', foreground: colors['string']?.replace('#', '') },
    { token: 'string.quoted.double', foreground: colors['string']?.replace('#', '') },
    { token: 'string.escape', foreground: colors['string.escape']?.replace('#', '') },
    { token: 'string.regexp', foreground: colors['string']?.replace('#', '') },
    
    // Comments - green
    { token: 'comment', foreground: colors['comment']?.replace('#', ''), fontStyle: 'italic' },
    { token: 'comment.line', foreground: colors['comment']?.replace('#', ''), fontStyle: 'italic' },
    { token: 'comment.block', foreground: colors['comment']?.replace('#', ''), fontStyle: 'italic' },
    { token: 'comment.documentation', foreground: colors['comment']?.replace('#', ''), fontStyle: 'italic' },
    
    // Numbers - light purple
    { token: 'number', foreground: colors['number']?.replace('#', '') },
    { token: 'number.hex', foreground: colors['number']?.replace('#', '') },
    { token: 'number.octal', foreground: colors['number']?.replace('#', '') },
    { token: 'number.binary', foreground: colors['number']?.replace('#', '') },
    { token: 'constant.numeric', foreground: colors['number']?.replace('#', '') },
    
    // Constants - light blue
    { token: 'constant', foreground: colors['constant']?.replace('#', '') },
    { token: 'constant.language', foreground: colors['keyword']?.replace('#', '') },
    { token: 'constant.language.null', foreground: colors['constant']?.replace('#', '') },
    { token: 'constant.language.undefined', foreground: colors['constant']?.replace('#', '') },
    { token: 'constant.language.boolean', foreground: colors['constant']?.replace('#', '') },
    
    // Functions - yellow
    { token: 'entity.name.function', foreground: colors['function']?.replace('#', ''), fontStyle: '' },
    { token: 'entity.name.function.constructor', foreground: colors['function']?.replace('#', ''), fontStyle: '' },
    { token: 'support.function', foreground: colors['function']?.replace('#', '') },
    { token: 'support.function.builtin', foreground: colors['function']?.replace('#', '') },
    { token: 'variable.function', foreground: colors['function']?.replace('#', '') },
    { token: 'identifier.function', foreground: colors['function']?.replace('#', '') },
    
    // Classes - teal/cyan
    { token: 'entity.name.class', foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'entity.name.type', foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'entity.name.type.class', foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'support.class', foreground: colors['class']?.replace('#', '') },
    { token: 'support.type', foreground: colors['class']?.replace('#', '') },
    { token: 'entity.name.type.interface', foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'entity.name.type.enum', foreground: colors['constant']?.replace('#', '') },
    
    // Variables - light blue/cyan
    { token: 'variable', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.other', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.parameter', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.other.property', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.other.member', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.other.property.static', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.other.constant', foreground: colors['constant']?.replace('#', '') },
    { token: 'variable.other.local', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.language', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.language.self', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.language.this', foreground: colors['variable']?.replace('#', '') },
    { token: 'variable.language.super', foreground: colors['variable']?.replace('#', '') },
    { token: 'identifier', foreground: colors['variable']?.replace('#', '') },
    { token: 'identifier.variable', foreground: colors['variable']?.replace('#', '') },
    { token: 'identifier.class', foreground: colors['class']?.replace('#', '') },
    
    // Operators - white
    { token: 'operator', foreground: colors['operator']?.replace('#', '') },
    { token: 'keyword.operator', foreground: colors['operator']?.replace('#', '') },
    { token: 'punctuation.operator', foreground: colors['operator']?.replace('#', '') },
    
    // Delimiters
    { token: 'delimiter', foreground: colors['operator']?.replace('#', '') },
    { token: 'punctuation', foreground: colors['operator']?.replace('#', '') },
    { token: 'punctuation.accessor', foreground: colors['operator']?.replace('#', '') },
    
    // Tags (for HTML/XML)
    { token: 'tag', foreground: colors['tag']?.replace('#', '') },
    { token: 'tag.name', foreground: colors['tag']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'tag.selector', foreground: colors['tag']?.replace('#', '') },
    { token: 'entity.name.tag', foreground: colors['tag']?.replace('#', ''), fontStyle: 'bold' },
    
    // Attributes
    { token: 'entity.other.attribute-name', foreground: colors['variable']?.replace('#', '') },
    { token: 'entity.other.attribute-name.class', foreground: colors['variable']?.replace('#', '') },
    { token: 'entity.other.attribute-name.id', foreground: colors['variable']?.replace('#', '') },
    
    // Python specific
    { token: 'keyword.python', foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' },
    { token: 'variable.parameter.function.language.special.self.python', foreground: colors['variable']?.replace('#', '') },
  ];
}

/**
 * Get semantic token rules for proper variable, function, and class highlighting
 */
function getSemanticTokenRules(colors) {
  return [
    // Semantic tokens for proper differentiation
    ['variable', { foreground: colors['variable']?.replace('#', '') }],
    ['variable.readonly', { foreground: colors['constant']?.replace('#', '') }],
    ['variable.defaultLibrary', { foreground: colors['variable']?.replace('#', '') }],
    
    ['parameter', { foreground: colors['variable']?.replace('#', '') }],
    ['parameter.readonly', { foreground: colors['constant']?.replace('#', '') }],
    
    ['function', { foreground: colors['function']?.replace('#', '') }],
    ['function.defaultLibrary', { foreground: colors['function']?.replace('#', '') }],
    ['method', { foreground: colors['function']?.replace('#', '') }],
    ['method.readonly', { foreground: colors['function']?.replace('#', '') }],
    
    ['class', { foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' }],
    ['class.defaultLibrary', { foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' }],
    ['struct', { foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' }],
    ['interface', { foreground: colors['class']?.replace('#', ''), fontStyle: 'bold' }],
    ['enum', { foreground: colors['constant']?.replace('#', '') }],
    ['enumMember', { foreground: colors['constant']?.replace('#', '') }],
    ['type', { foreground: colors['type']?.replace('#', '') }],
    ['typeParameter', { foreground: colors['type']?.replace('#', '') }],
    
    ['namespace', { foreground: colors['class']?.replace('#', '') }],
    ['module', { foreground: colors['class']?.replace('#', '') }],
    
    ['property', { foreground: colors['variable']?.replace('#', '') }],
    ['property.readonly', { foreground: colors['constant']?.replace('#', '') }],
    ['property.defaultLibrary', { foreground: colors['variable']?.replace('#', '') }],
    
    ['decorator', { foreground: colors['keyword']?.replace('#', '') }],
    ['comment', { foreground: colors['comment']?.replace('#', ''), fontStyle: 'italic' }],
    
    ['string', { foreground: colors['string']?.replace('#', '') }],
    ['string.escape', { foreground: colors['string.escape']?.replace('#', '') }],
    
    ['number', { foreground: colors['number']?.replace('#', '') }],
    ['regexp', { foreground: colors['string']?.replace('#', '') }],
    
    ['operator', { foreground: colors['operator']?.replace('#', '') }],
    ['keyword', { foreground: colors['keyword']?.replace('#', ''), fontStyle: 'bold' }],
    ['keyword.control', { foreground: colors['keyword.control']?.replace('#', ''), fontStyle: 'bold' }],
    
    ['macro', { foreground: colors['keyword']?.replace('#', '') }],
    ['label', { foreground: colors['variable']?.replace('#', '') }],
  ];
}

/**
 * Get editor colors configuration
 */
function getEditorColors(colors) {
  return {
    'editor.background': colors['editor.background'],
    'editor.foreground': colors['editor.foreground'],
    'editorLineNumber.foreground': colors['editorLineNumber.foreground'],
    'editorLineNumber.activeForeground': colors['editorLineNumber.activeForeground'],
    'editor.selectionBackground': colors['editor.selectionBackground'],
    'editor.inactiveSelectionBackground': colors['editor.inactiveSelectionBackground'],
    'editor.selectionForeground': colors['editor.selectionForeground'],
    'editorCursor.foreground': colors['editorCursor.foreground'],
    'editor.lineHighlightBackground': colors['editor.lineHighlightBackground'],
    'editorCursorLine.background': colors['editorCursorLine.background'],
    'editor.lineHighlightBorder': colors['editor.lineHighlightBorder'],
    'editorGroupHeader.tabsBackground': colors['editorGroupHeader.tabsBackground'],
    'editorGroup.emptyBackground': colors['editorGroup.emptyBackground'],
    'tab.activeBackground': colors['tab.activeBackground'],
    'tab.inactiveBackground': colors['tab.inactiveBackground'],
    'tab.border': colors['tab.border'],
    'tab.activeForeground': colors['tab.activeForeground'],
    'tab.inactiveForeground': colors['tab.inactiveForeground'],
    'editorPane.background': colors['editorPane.background'],
    'editorWidget.background': colors['editorWidget.background'],
    'editorWidget.border': colors['editorWidget.border'],
    'statusBar.background': colors['statusBar.background'],
    'statusBar.foreground': colors['statusBar.foreground'],
    'input.background': colors['input.background'],
    'input.border': colors['input.border'],
    'input.foreground': colors['input.foreground'],
    'input.placeholderForeground': colors['input.placeholderForeground'],
    'button.background': colors['button.background'],
    'button.foreground': colors['button.foreground'],
    'button.hoverBackground': colors['button.hoverBackground'],
  };
}

/**
 * Save theme preference to localStorage
 */
export function saveThemePreference(themeName) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('editor_theme', themeName);
  }
}

/**
 * Load theme preference from localStorage
 */
export function loadThemePreference() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('editor_theme') || 'vs-code-dark';
  }
  return 'vs-code-dark';
}

/**
 * Create or update CSS variables for theme colors
 */
export function applyCSSVariables(themeName = 'vs-code-dark') {
  const colors = getTheme(themeName);
  const root = typeof document !== 'undefined' ? document.documentElement : null;

  if (!root) return;

  Object.entries(colors).forEach(([key, value]) => {
    // Transform key from 'editor.background' to '--editor-background'
    const cssVarName = '--' + key.replace(/\./g, '-');
    root.style.setProperty(cssVarName, value);
  });
}

/**
 * Get available themes
 */
export function getAvailableThemes() {
  return [
    { id: 'vs-code-dark', name: 'VS Code Dark' },
    { id: 'vs-code-light', name: 'VS Code Light' },
    { id: 'onedark', name: 'One Dark' },
    { id: 'dracula', name: 'Dracula' },
  ];
}
