import re

with open("pages/editor.tsx", "r", encoding="utf-8") as f:
    text = f.read()

match = re.search(r"export default function EditorPage\(\) \{\n(.*?)  return \(", text, re.DOTALL)
if match:
    print(match.group(1)[:1000] + "...\n" + match.group(1)[-1000:])
else:
    match2 = re.search(r"export function CodeEditor\(\) \{\n(.*?)  return \(", text, re.DOTALL)
    if match2:
        with open("editor_functions.txt", "w") as out:
            out.write(match2.group(1))
        print("Wrote inner code to editor_functions.txt")
