import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Copy, Check, ChevronDown, ChevronRight, FileCode, FolderOpen, Bot, Terminal, Server, Shield, Download } from 'lucide-react';
import { toast } from 'sonner';
import { BOT_FILES } from '@/data/portalBotFiles';

// Access controlled by admin role check below

// Organize files into folders for the tree view
interface FileTreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children?: FileTreeNode[];
}

function buildFileTree(): FileTreeNode[] {
  const paths = Object.keys(BOT_FILES).sort();
  const root: FileTreeNode[] = [];

  for (const path of paths) {
    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const fullPath = parts.slice(0, i + 1).join('/');

      const existing = current.find(n => n.name === part);
      if (existing && !isLast) {
        current = existing.children || [];
      } else if (!existing) {
        const node: FileTreeNode = {
          name: part,
          path: fullPath,
          isFolder: !isLast,
          children: isLast ? undefined : [],
        };
        current.push(node);
        if (!isLast) current = node.children!;
      }
    }
  }

  return root;
}

function FileItem({ node, selectedFile, onSelect }: { node: FileTreeNode; selectedFile: string | null; onSelect: (path: string) => void }) {
  const [isOpen, setIsOpen] = useState(true);

  if (node.isFolder) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 w-full text-left py-1 px-2 rounded hover:bg-muted/50 text-sm"
        >
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
          <FolderOpen className="h-3.5 w-3.5 text-primary" />
          <span className="text-muted-foreground">{node.name}</span>
        </button>
        {isOpen && node.children && (
          <div className="ml-4">
            {node.children.map(child => (
              <FileItem key={child.path} node={child} selectedFile={selectedFile} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`flex items-center gap-1.5 w-full text-left py-1 px-2 rounded text-sm transition-colors ${
        selectedFile === node.path ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50 text-foreground'
      }`}
    >
      <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="truncate">{node.name}</span>
    </button>
  );
}

export default function AdminPortalBotSetup() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [selectedFile, setSelectedFile] = useState<string | null>('package.json');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!user || !isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const fileTree = buildFileTree();

  const copyFileContent = (path: string) => {
    const content = BOT_FILES[path];
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopiedFile(path);
    toast.success(`Copied ${path}`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const copyAllFiles = () => {
    const allContent = Object.entries(BOT_FILES)
      .map(([path, content]) => `// ===== ${path} =====\n${content}`)
      .join('\n\n\n');
    navigator.clipboard.writeText(allContent);
    setCopiedAll(true);
    toast.success('Copied all files to clipboard');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Portal Bot Setup</h1>
              <p className="text-sm text-muted-foreground">Persistent Eclipse Portal Bot files</p>
            </div>
          </div>
          <Button onClick={copyAllFiles} variant="outline" size="sm">
            {copiedAll ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
            {copiedAll ? 'Copied!' : 'Copy All'}
          </Button>
        </div>

        {/* Setup Steps */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
            <h3 className="font-semibold text-sm text-base flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Quick Setup
            </h3>
          </div>
          <div className="p-4 space-y-2">
            {[
              { step: '1', text: 'Create a folder called eclipse-portal-bot and add all files below' },
              { step: '2', text: 'Run npm install to install dependencies' },
              { step: '3', text: 'Copy .env.example to .env and fill in your values' },
              { step: '4', text: 'Run npm run register to register slash commands' },
              { step: '5', text: 'Run npm start to start the bot' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="shrink-0 mt-0.5">{item.step}</Badge>
                <span className="text-muted-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Deployment Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-1">
              <Server className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Railway</span>
            </div>
            <p className="text-xs text-muted-foreground">~£5/mo, easy deploy</p>
          </div>
          <div className="border border-border rounded-xl overflow-hidden p-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Fly.io</span>
            </div>
            <p className="text-xs text-muted-foreground">Free tier available</p>
          </div>
        </div>

        {/* File Browser */}
        <div className="border border-border rounded-xl overflow-hidden overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2">
        <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm text-base">Bot Files ({Object.keys(BOT_FILES).length} files)</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Tap a file to view, then copy</p>
              </div>
              <Button
                size="sm"
                onClick={async () => {
                  const JSZip = (await import('jszip')).default;
                  const zip = new JSZip();
                  const folder = zip.folder('eclipse-portal-bot')!;
                  Object.entries(BOT_FILES).forEach(([path, content]) => {
                    folder.file(path, content);
                  });
                  const blob = await zip.generateAsync({ type: 'blob' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'eclipse-portal-bot.zip';
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Downloading eclipse-portal-bot.zip');
                }}
                className="shrink-0"
              >
                <Download className="h-4 w-4 mr-1" />
                Download ZIP
              </Button>
            </div>
          </div>
          <div className="p-4 p-0">
            {/* File Tree */}
            <div className="border-b p-3 max-h-64 overflow-y-auto">
              {fileTree.map(node => (
                <FileItem key={node.path} node={node} selectedFile={selectedFile} onSelect={setSelectedFile} />
              ))}
            </div>

            {/* File Content */}
            {selectedFile && BOT_FILES[selectedFile] && (
              <div className="relative">
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-mono">{selectedFile}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyFileContent(selectedFile)}
                    className="h-7 px-2"
                  >
                    {copiedFile === selectedFile ? (
                      <><Check className="h-3 w-3 mr-1 text-green-500" /> Copied</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" /> Copy</>
                    )}
                  </Button>
                </div>
                <ScrollArea className="h-[400px]">
                  <pre className="p-3 text-xs font-mono whitespace-pre-wrap break-all">
                    <code>{BOT_FILES[selectedFile]}</code>
                  </pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
