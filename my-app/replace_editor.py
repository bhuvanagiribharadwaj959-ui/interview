import re

with open("pages/editor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# find the main return statement of CodeEditor
match = re.search(r"(export function CodeEditor.*?return \()(.*)(\);?\n})", content, re.DOTALL)
if match:
    pre = content[:match.start(2)]
    post = content[match.end(2):]
    # We will inject the new UI in `pre + new_ui + post`
else:
    print("Could not find the return block")
