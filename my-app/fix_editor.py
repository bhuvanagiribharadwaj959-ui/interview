with open('pages/editor.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('﻿', '')
content = content.replace('\ufeff', '')

with open('pages/editor.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
