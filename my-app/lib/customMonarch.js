
let generalEnhancementsRegistered = false;
let pythonEnhancementsRegistered = false;

function createGenericTokenizer({
  keywords = [],
  importKeywords = [],
  declarationKeywords = [],
  typeKeywords = [],
  builtins = [],
}) {
  return {
    defaultToken: '',
    tokenPostfix: '.custom',
    keywords,
    importKeywords,
    declarationKeywords,
    typeKeywords,
    builtins,
    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],
    tokenizer: {
      root: [
        { include: '@whitespace' },
        { include: '@numbers' },
        { include: '@strings' },
        [/[,:;]/, 'delimiter'],
        [/[{}\[\]()]/, '@brackets'],
        [/#\s*include\b/, 'keyword.import'],
        [/(class|interface|enum|record|struct|trait|protocol|module)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'entity.name.class']],
        [/(def|func|function|fn)(\s+)([a-zA-Z_]\w*[!?]?)/, ['keyword', 'white', 'entity.name.function']],
        [/([a-zA-Z_]\w*[!?]?)(?=\s*\()/, {
          cases: {
            '@keywords': 'keyword',
            '@builtins': 'support.function',
            '@default': 'entity.name.function'
          }
        }],
        [/\b[A-Z][\w$]*\b/, 'support.class'],
        [/[a-zA-Z_]\w*[!?]?/, {
          cases: {
            '@importKeywords': 'keyword.import',
            '@typeKeywords': 'storage.type',
            '@declarationKeywords': 'keyword',
            '@keywords': 'keyword',
            '@builtins': 'support.class',
            '@default': 'identifier'
          }
        }],
        [/[+\-*/%=&|!<>^~?:]+/, 'operators']
      ],
      whitespace: [
        [/\s+/, 'white'],
        [/\/\/.*$/, 'comment'],
        [/#.*$/, 'comment'],
        [/\/\*/, 'comment', '@comment'],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/./, 'comment']
      ],
      numbers: [
        [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'number.hex'],
        [/-?(\d*\.)?\d+([eE][+\-]?\d+)?/, 'number']
      ],
      strings: [
        [/'/, 'string', '@stringBody'],
        [/"/, 'string', '@dblStringBody'],
        [/`/, 'string', '@templateStringBody']
      ],
      stringBody: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop']
      ],
      dblStringBody: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ],
      templateStringBody: [
        [/[^\\`$]+/, 'string'],
        [/\\./, 'string.escape'],
        [/`/, 'string', '@pop']
      ]
    }
  };
}

export function enhanceMonacoGeneral(monaco) {
  if (generalEnhancementsRegistered) {
    return;
  }

  // Common keywords for many languages
  const commonKeywords = ['if', 'else', 'for', 'while', 'return', 'break', 'continue', 'class', 'interface', 'public', 'private', 'static', 'function', 'import', 'export', 'let', 'const', 'var', 'true', 'false', 'null', 'void', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'async', 'await'];
  
  const languageKeywords = {
    'javascript': ['function', 'const', 'let', 'var', '=>', 'import', 'export', 'return', 'if', 'else', 'console', 'log'],
    'typescript': ['interface', 'type', 'enum', 'abstract', 'implements', 'readonly'],
    'java': ['public', 'private', 'protected', 'class', 'interface', 'package', 'import', 'System', 'out', 'println'],
    'cpp': ['include', 'int', 'main', 'std', 'cout', 'endl', 'vector', 'string', 'using', 'namespace'],
    'csharp': ['namespace', 'using', 'System', 'Console', 'WriteLine', 'var', 'class', 'void', 'public'],
    'go': ['package', 'import', 'func', 'main', 'fmt', 'Println', 'chan', 'select', 'go', 'defer'],
    'php': ['echo', 'function', 'public', 'private', 'protected', 'class', 'array', 'foreach', 'global'],
    'ruby': ['def', 'end', 'puts', 'begin', 'rescue', 'module', 'class', 'self'],
    'rust': ['fn', 'let', 'mut', 'impl', 'struct', 'enum', 'pub', 'use', 'crate', 'println!'],
    'swift': ['func', 'var', 'let', 'class', 'struct', 'enum', 'guard', 'print', 'import']
  };

  const languages = ['javascript', 'typescript', 'java', 'cpp', 'csharp', 'go', 'php', 'ruby', 'rust', 'swift'];

  const tokenConfigs = {
    javascript: {
      keywords: [...commonKeywords, 'from', 'default'],
      importKeywords: ['import', 'from', 'export'],
      declarationKeywords: ['class'],
      typeKeywords: ['const', 'let', 'var'],
      builtins: ['console', 'Array', 'Promise', 'Map', 'Set', 'Date', 'Math']
    },
    typescript: {
      keywords: [...commonKeywords, 'from', 'default', 'implements', 'readonly', 'type', 'interface'],
      importKeywords: ['import', 'from', 'export'],
      declarationKeywords: ['class', 'interface', 'enum', 'type'],
      typeKeywords: ['string', 'number', 'boolean', 'unknown', 'never', 'void'],
      builtins: ['Promise', 'Array', 'Record', 'Partial', 'Pick']
    },
    java: {
      keywords: ['public', 'private', 'protected', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'new', 'try', 'catch', 'throw', 'extends', 'implements', 'package', 'import', 'class', 'interface', 'enum'],
      importKeywords: ['package', 'import'],
      declarationKeywords: ['class', 'interface', 'enum', 'record'],
      typeKeywords: ['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'void', 'String'],
      builtins: ['System', 'String', 'Integer', 'Double', 'Float', 'List', 'Map', 'Set']
    },
    cpp: {
      keywords: ['if', 'else', 'for', 'while', 'return', 'break', 'continue', 'class', 'struct', 'namespace', 'using', 'public', 'private', 'protected', 'template', 'typename', 'new', 'delete'],
      importKeywords: ['include', 'using', 'namespace'],
      declarationKeywords: ['class', 'struct', 'enum'],
      typeKeywords: ['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'auto', 'string'],
      builtins: ['std', 'vector', 'string', 'cout', 'cin', 'endl']
    },
    csharp: {
      keywords: ['public', 'private', 'protected', 'static', 'void', 'return', 'if', 'else', 'for', 'while', 'new', 'namespace', 'using', 'class', 'interface', 'enum'],
      importKeywords: ['using', 'namespace'],
      declarationKeywords: ['class', 'interface', 'enum', 'record', 'struct'],
      typeKeywords: ['int', 'long', 'double', 'float', 'bool', 'char', 'void', 'string', 'var'],
      builtins: ['System', 'Console', 'String', 'List', 'Dictionary', 'Task']
    },
    go: {
      keywords: ['if', 'else', 'for', 'return', 'break', 'continue', 'func', 'type', 'struct', 'interface', 'go', 'defer', 'range', 'switch'],
      importKeywords: ['package', 'import'],
      declarationKeywords: ['struct', 'interface', 'type'],
      typeKeywords: ['int', 'int64', 'float64', 'bool', 'string', 'byte', 'rune'],
      builtins: ['fmt', 'Println', 'Printf', 'Errorf', 'make', 'append']
    },
    php: {
      keywords: ['function', 'class', 'interface', 'trait', 'public', 'private', 'protected', 'return', 'if', 'else', 'foreach', 'new', 'namespace', 'use'],
      importKeywords: ['namespace', 'use', 'require', 'include'],
      declarationKeywords: ['class', 'interface', 'trait', 'enum'],
      typeKeywords: ['int', 'float', 'bool', 'string', 'array', 'void'],
      builtins: ['echo', 'print', 'array', 'count', 'strlen']
    },
    ruby: {
      keywords: ['def', 'end', 'class', 'module', 'if', 'else', 'elsif', 'do', 'while', 'return', 'yield'],
      importKeywords: ['require', 'include', 'extend'],
      declarationKeywords: ['class', 'module'],
      typeKeywords: [],
      builtins: ['puts', 'print', 'attr_accessor', 'initialize']
    },
    rust: {
      keywords: ['fn', 'let', 'mut', 'struct', 'enum', 'impl', 'trait', 'if', 'else', 'for', 'while', 'return', 'match', 'pub', 'use'],
      importKeywords: ['use', 'mod', 'crate'],
      declarationKeywords: ['struct', 'enum', 'trait', 'impl'],
      typeKeywords: ['i32', 'i64', 'u32', 'u64', 'f32', 'f64', 'bool', 'str'],
      builtins: ['println', 'String', 'Vec', 'Option', 'Result']
    },
    swift: {
      keywords: ['func', 'class', 'struct', 'enum', 'protocol', 'extension', 'if', 'else', 'for', 'while', 'return', 'let', 'var', 'guard', 'import'],
      importKeywords: ['import'],
      declarationKeywords: ['class', 'struct', 'enum', 'protocol', 'extension'],
      typeKeywords: ['Int', 'Double', 'Float', 'Bool', 'String', 'Void'],
      builtins: ['print', 'Foundation', 'Array', 'Dictionary']
    }
  };

  Object.entries(tokenConfigs).forEach(([languageId, config]) => {
    monaco.languages.setMonarchTokensProvider(languageId, createGenericTokenizer(config));
  });
  
  languages.forEach(lang => {
    monaco.languages.registerCompletionItemProvider(lang, {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [];

        // Add language-specific keywords
        if (languageKeywords[lang]) {
          languageKeywords[lang].forEach(kw => {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range: range,
            });
          });
        }

        // Add common keywords
        commonKeywords.forEach(kw => {
          if (!suggestions.some(s => s.label === kw)) {
            suggestions.push({
              label: kw,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range: range,
            });
          }
        });

        // Get all unique words in the current document as potential suggestions
        const currentCode = model.getValue();
        const tokens = currentCode.match(/[a-zA-Z_]\w*/g) || [];
        const uniqueTokens = Array.from(new Set(tokens.filter(t => t.length > 2 && t !== word.word)));

        uniqueTokens.forEach(token => {
          if (!suggestions.some(s => s.label === token)) {
            suggestions.push({
              label: token,
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: token,
              range: range,
            });
          }
        });

        return { suggestions };
      }
    });
  });

  generalEnhancementsRegistered = true;
}

export function enhanceMonacoPython(monaco) {
  if (pythonEnhancementsRegistered) {
    return;
  }

  monaco.languages.setMonarchTokensProvider('python', {
    defaultToken: '',
    tokenPostfix: '.python',

    keywords: [
      'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
      'else', 'except', 'exec', 'finally', 'for', 'from', 'global', 'if', 'import',
      'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return',
      'try', 'while', 'with', 'yield',
      'True', 'False',
    ],

    // Builtins that act like functions or types
    builtins: [
      'abs', 'all', 'any', 'apply', 'basestring', 'bin', 'bool', 'buffer', 'bytearray',
      'callable', 'chr', 'classmethod', 'cmp', 'coerce', 'compile', 'complex',
      'delattr', 'dict', 'dir', 'divmod', 'enumerate', 'eval', 'execfile', 'file',
      'filter', 'float', 'format', 'frozenset', 'getattr', 'globals', 'hasattr',
      'hash', 'help', 'hex', 'id', 'input', 'int', 'intern', 'isinstance',
      'issubclass', 'iter', 'len', 'list', 'locals', 'long', 'map', 'max', 'min',
      'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 'property', 'range',
      'raw_input', 'reduce', 'reload', 'repr', 'reversed', 'round', 'set', 'setattr',
      'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type',
      'unichr', 'unicode', 'vars', 'xrange', 'zip',
      '__name__', '__main__', '__init__', '__str__', '__repr__', '__dict__', '__doc__', '__file__',
    ],

    brackets: [
      { open: '{', close: '}', token: 'delimiter.curly' },
      { open: '[', close: ']', token: 'delimiter.bracket' },
      { open: '(', close: ')', token: 'delimiter.parenthesis' }
    ],

    tokenizer: {
      root: [
        { include: '@whitespace' },
        { include: '@numbers' },
        { include: '@strings' },

        [/[,:;]/, 'delimiter'],
        [/[{}\[\]()]/, '@brackets'],

        // Class definition: class Name
        [/(class)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'entity.name.class']],
        
        // Function definition: def name
        [/(def)(\s+)([a-zA-Z_]\w*)/, ['keyword', 'white', 'entity.name.function']],

        // Decorators
        [/@[a-zA-Z_]\w*/, 'tag'],

        // Function call: identifier followed by (
        // We use a separate rule to catch function calls before general identifiers
        [/([a-zA-Z_]\w*)(?=\s*\()/, {
          cases: {
            '@keywords': 'keyword',
            '@builtins': 'support.function',
            '@default': 'entity.name.function'
          }
        }],

        // General Identifiers
        [/[a-zA-Z_]\w*/, {
          cases: {
            'self': 'variable.language.self',
            '@keywords': 'keyword',
            '@builtins': 'support.type',
            '@default': 'identifier'
          }
        }],
      ],

      // Deal with white space
      whitespace: [
        [/\s+/, 'white'],
        [/(^#.*$)/, 'comment'],
        [/'''/, 'string', '@endDocString'],
        [/"""/, 'string', '@endDocString'],
      ],
      endDocString: [
        [/[^'"]+/, 'string'],
        [/\\'/, 'string'],
        [/\\"/, 'string'],
        [/'''/, 'string', '@popall'],
        [/"""/, 'string', '@popall'],
        [/'/, 'string'],
        [/"/, 'string']
      ],

      // Recognize hex, negatives, decimals, imaginaries, longs, and standard numbers
      numbers: [
        [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, 'number.hex'],
        [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, 'number']
      ],

      // Recognize strings
      strings: [
        [/'$/, 'string.escape', '@popall'],
        [/'/, 'string.escape', '@stringBody'],
        [/"$/, 'string.escape', '@popall'],
        [/"/, 'string.escape', '@dblStringBody']
      ],
      stringBody: [
        [/[^\\']+$/, 'string', '@popall'],
        [/[^\\']+/, 'string'],
        [/\\./, 'string'],
        [/'/, 'string.escape', '@popall'],
        [/\\$/, 'string']
      ],
      dblStringBody: [
        [/[^\\"]+$/, 'string', '@popall'],
        [/[^\\"]+/, 'string'],
        [/\\./, 'string'],
        [/"/, 'string.escape', '@popall'],
        [/\\$/, 'string']
      ]
    }
  });

  // Register a simple completion provider for basic Python IntelliSense
  monaco.languages.registerCompletionItemProvider('python', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        ...[
          'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif',
          'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import',
          'in', 'is', 'lambda', 'None', 'not', 'or', 'pass', 'raise', 'return',
          'try', 'while', 'with', 'yield', 'True', 'False'
        ].map(kw => ({
          label: kw,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: kw,
          range: range,
        })),
        ...[
          'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'callable', 'chr', 
          'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod', 
          'enumerate', 'eval', 'filter', 'float', 'format', 'frozenset', 'getattr', 
          'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int', 
          'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 
          'max', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print', 
          'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 
          'slice', 'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 
          'type', 'vars', 'zip'
        ].map(builtin => ({
          label: builtin,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: builtin,
          range: range,
        }))
      ];

      return { suggestions: suggestions };
    },
  });

  pythonEnhancementsRegistered = true;
}
