import re

with open('pages/editor.tsx', 'rb') as f:
    raw = f.read()

try:
    content = raw.decode('utf-16-le')
    if '\x00' not in content[:100]:
        content = raw.decode('utf-8', errors='ignore')
except:
    content = raw.decode('utf-8', errors='ignore')

content = content.replace('\ufeff', '')
content = content.replace('ï»¿', '')

# Replace missing imports
content = re.sub(
    r'import \{([\s\S]*?)Loader2,\s*Check\s*\} from "lucide-react";',
    r'import {\1Loader2,\n  Check,\n  Settings,\n  Minimize2,\n  Play,\n  CheckCircle2,\n  ChevronUp,\n  XCircle\n} from "lucide-react";',
    content
)

state_insert = """  const [isRunning, setIsRunning] = useState(false);
  const [showConsole, setShowConsole] = useState(false);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const [editorFontSize, setEditorFontSize] = useState(14);
  const theme = "vs";

  const startResizing = (e: any) => {
    e.preventDefault();
    setActiveResizer('question');
  };"""

content = re.sub(
    r'  const \[isRunning, setIsRunning\] = useState\(false\);\s*const \[showConsole, setShowConsole\] = useState\(false\);',
    state_insert,
    content
)

# Remove settings button explicitly
content = re.sub(r'\s*<button\s*onClick=\{\(\) => setShowSettings\(!showSettings\)\}[\s\S]*?<Settings size=\{16\} />\s*</button>', '', content)

content = content.replace("monaco.editor.setTheme('custom-dark');", "monaco.editor.setTheme('vs');")

# Also, change the top left panel tag styling and right panel
# we remove the testcase error since we know they don't want "Topics/Companies"
content = content.replace('bg-[#111827]', 'bg-white')
content = content.replace('text-[#111827]', 'text-gray-900')
content = content.replace('bg-[#FDFDFD]', 'bg-white')

with open('pages/editor.tsx', 'wb') as f:
    f.write(content.encode('utf-8'))

print("Done fixing editor.tsx")
