import { Navigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { BotGhostCommandReference } from '@/components/admin/BotGhostCommandReference';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, Copy, Bot, AlertTriangle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const PRIMARY_ADMIN_EMAIL = 'alicanimir1@gmail.com';

const CopyBlock = ({ label, text }: { label: string; text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1 text-xs">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="text-xs bg-muted p-3 rounded-lg border overflow-x-auto whitespace-pre-wrap break-all">{text}</pre>
    </div>
  );
};

const StepCard = ({ step, title, children }: { step: number; title: string; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-3">
        <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
          {step}
        </span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">{children}</CardContent>
  </Card>
);

const ENDPOINT_URL = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/botghost-customer-api';

const COMMANDS = [
  {
    name: '/link',
    description: 'Check if Discord is linked to Eclipse',
    bgAction: 'link',
    options: [],
    jsonBody: `{\n  "action": "link",\n  "discord_id": "{User.id}",\n  "discord_username": "{User.username}"\n}`,
    responseVar: 'link',
    responseEmbed: '**{link.response.message}**',
    sendAsDM: false,
    buttonUrl: null,
    buttonLabel: null,
    notes: 'No command options needed. Shows link status and instructions.',
  },
  {
    name: '/verify',
    description: 'Link Discord using a verification code from Eclipse',
    bgAction: 'verify_code',
    options: [{ name: 'code', type: 'String', required: true, description: 'The verification code from Eclipse' }],
    jsonBody: `{\n  "action": "verify_code",\n  "discord_id": "{User.id}",\n  "discord_username": "{User.username}",\n  "code": "{option_code}"\n}`,
    responseVar: 'link',
    responseEmbed: '**{link.response.message}**',
    sendAsDM: false,
    buttonUrl: null,
    buttonLabel: null,
    notes: 'Add a command option named "code" (String, Required).',
  },
  {
    name: '/profile',
    description: 'View your linked Eclipse profile',
    bgAction: 'profile',
    options: [],
    jsonBody: `{\n  "action": "profile",\n  "discord_id": "{User.id}",\n  "discord_username": "{User.username}"\n}`,
    responseVar: 'profile',
    responseEmbed: '**{profile.response.message}**',
    sendAsDM: false,
    buttonUrl: '{profile.response.button_url}',
    buttonLabel: 'Manage my Account',
    notes: 'Add a Link Button after the embed. URL: {profile.response.button_url}, Label: "Manage my Account".',
  },
  {
    name: '/purchases',
    description: 'View your purchase history',
    bgAction: 'purchases',
    options: [],
    jsonBody: `{\n  "action": "purchases",\n  "discord_id": "{User.id}",\n  "discord_username": "{User.username}"\n}`,
    responseVar: 'purchases',
    responseEmbed: '**{purchases.response.message}**',
    sendAsDM: false,
    buttonUrl: null,
    buttonLabel: null,
    notes: 'No command options needed.',
  },
  {
    name: '/retrieve',
    description: 'Get a download link for a purchased product (sent via DM)',
    bgAction: 'download',
    options: [{ name: 'product', type: 'String', required: false, description: 'Product name to retrieve' }],
    jsonBody: `{\n  "action": "download",\n  "discord_id": "{User.id}",\n  "discord_username": "{User.username}",\n  "product_name": "{option_product}"\n}`,
    responseVar: 'retrieve',
    responseEmbed: '**{retrieve.response.message}**',
    sendAsDM: true,
    buttonUrl: '{retrieve.response.button_url}',
    buttonLabel: 'Download',
    notes: 'Set response to "Send as DM". Add Link Button with URL: {retrieve.response.button_url}. The "product" option is optional (String).',
  },
];

export default function BotGhostSetup() {
  const { user, loading } = useAdminAuth();

  if (loading) return null;
  if (!user || user.email !== PRIMARY_ADMIN_EMAIL) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Bot className="h-6 w-6" />
            BotGhost Setup Guide
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step instructions to create each custom command in BotGhost using HTTP Request actions.
          </p>
        </div>

        {/* Prerequisites */}
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Prerequisites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ul className="list-disc list-inside space-y-1.5 text-muted-foreground">
              <li>A <strong>BotGhost account</strong> with your bot added to the server</li>
              <li>Your bot's <strong>Discord Bot Token</strong> configured in BotGhost</li>
              <li>The <strong>Eclipse API Key</strong> (stored as <code className="text-xs bg-muted px-1 rounded">BOTGHOST_API_KEY</code> in your backend secrets)</li>
            </ul>
            <div className="pt-2">
              <a href="https://botghost.com/dashboard" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open BotGhost Dashboard
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* General Steps */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">General Workflow (repeat for each command)</h2>

          <StepCard step={1} title="Create a new Custom Command">
            <p className="text-sm text-muted-foreground">
              In BotGhost Dashboard → <strong>Custom Commands</strong> → click <strong>"Create Command"</strong>.
              Set the command name (e.g. <code className="text-xs bg-muted px-1 rounded">/link</code>) and description.
            </p>
          </StepCard>

          <StepCard step={2} title="Add command options (if needed)">
            <p className="text-sm text-muted-foreground">
              Some commands need user input. Click <strong>"Add Option"</strong> and set the name, type, and whether it's required.
              See each command card below for specifics.
            </p>
          </StepCard>

          <StepCard step={3} title='Add an "HTTP Request" action'>
            <p className="text-sm text-muted-foreground mb-3">
              In the command builder, add a new action → select <strong>"HTTP Request"</strong>. Then configure:
            </p>
            <CopyBlock label="URL" text={ENDPOINT_URL} />
            <div className="space-y-1">
              <span className="text-sm font-medium text-muted-foreground">Method</span>
              <p className="text-xs bg-muted p-2 rounded border font-mono">POST</p>
            </div>
            <CopyBlock label="Headers" text={`Content-Type: application/json\nx-api-key: YOUR_API_KEY_HERE`} />
            <p className="text-sm text-muted-foreground">
              Replace <code className="text-xs bg-muted px-1 rounded">YOUR_API_KEY_HERE</code> with your actual API key.
            </p>
            <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 space-y-1">
              <p className="font-medium">⚠️ Important checkboxes — enable both:</p>
              <ul className="list-disc list-inside">
                <li>"Replace variables in body"</li>
                <li>"Replace variables in HTTP Headers"</li>
              </ul>
            </div>
          </StepCard>

          <StepCard step={4} title="Set the JSON Body">
            <p className="text-sm text-muted-foreground">
              Paste the JSON body from the command card below into the <strong>Body</strong> field.
              BotGhost will replace <code className="text-xs bg-muted px-1 rounded">{'{User.id}'}</code> and
              <code className="text-xs bg-muted px-1 rounded ml-1">{'{User.username}'}</code> automatically.
            </p>
          </StepCard>

          <StepCard step={5} title="Configure the response">
            <p className="text-sm text-muted-foreground">
              Give the HTTP Request a <strong>variable name</strong> (see each command card). Then in the response action,
              use the variable to display the result, e.g. <code className="text-xs bg-muted px-1 rounded">{'{link.response.message}'}</code>.
            </p>
            <p className="text-sm text-muted-foreground">
              For commands with buttons: add a <strong>Link Button</strong> action after the response and set the URL to the
              variable shown in the command card.
            </p>
          </StepCard>
        </div>

        {/* Individual Command Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Command Configurations</h2>

          {COMMANDS.map((cmd) => (
            <Card key={cmd.bgAction}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{cmd.name}</CardTitle>
                  <div className="flex gap-1.5">
                    {cmd.sendAsDM && <Badge variant="secondary" className="text-xs">DM</Badge>}
                    {cmd.buttonUrl && <Badge variant="outline" className="text-xs">Has Button</Badge>}
                  </div>
                </div>
                <CardDescription>{cmd.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Options */}
                {cmd.options.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Command Options:</span>
                    <div className="space-y-1">
                      {cmd.options.map((opt) => (
                        <div key={opt.name} className="text-xs bg-muted p-2 rounded border flex items-center gap-2">
                          <code className="font-bold">{opt.name}</code>
                          <Badge variant="outline" className="text-[10px]">{opt.type}</Badge>
                          <Badge variant={opt.required ? 'default' : 'secondary'} className="text-[10px]">
                            {opt.required ? 'Required' : 'Optional'}
                          </Badge>
                          <span className="text-muted-foreground">— {opt.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* JSON Body */}
                <CopyBlock label="JSON Body" text={cmd.jsonBody} />

                {/* Variable Name */}
                <CopyBlock label="HTTP Request Variable Name" text={cmd.responseVar} />

                {/* Response Embed */}
                <CopyBlock label="Response Message / Embed Description" text={cmd.responseEmbed} />

                {/* Button */}
                {cmd.buttonUrl && (
                  <div className="rounded border border-blue-500/20 bg-blue-500/5 p-3 space-y-2">
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">🔗 Link Button</span>
                    <CopyBlock label="Button URL" text={cmd.buttonUrl} />
                    <CopyBlock label="Button Label" text={cmd.buttonLabel!} />
                  </div>
                )}

                {/* DM note */}
                {cmd.sendAsDM && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                    📩 Set this command's response to <strong>"Send as DM"</strong> in BotGhost.
                  </p>
                )}

                {/* Extra notes */}
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded border">
                  💡 {cmd.notes}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Troubleshooting */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">🔧 Troubleshooting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Command returns empty or error</p>
                <p className="text-muted-foreground text-xs">
                  Make sure both "Replace variables in body" and "Replace variables in HTTP Headers" checkboxes are enabled.
                </p>
              </div>
              <div>
                <p className="font-medium">401 Unauthorized</p>
                <p className="text-muted-foreground text-xs">
                  Check that your <code className="bg-muted px-1 rounded">x-api-key</code> header matches the
                  <code className="bg-muted px-1 rounded ml-1">BOTGHOST_API_KEY</code> secret stored in your backend.
                </p>
              </div>
              <div>
                <p className="font-medium">Variables not replaced (shows literal {'{User.id}'})</p>
                <p className="text-muted-foreground text-xs">
                  Ensure "Replace variables in body" is checked in the HTTP Request action settings.
                </p>
              </div>
              <div>
                <p className="font-medium">Button URL is empty</p>
                <p className="text-muted-foreground text-xs">
                  The API may return an empty <code className="bg-muted px-1 rounded">button_url</code> if the user isn't linked or has no purchases.
                  Add a condition in BotGhost to only show the button when the URL is not empty.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
