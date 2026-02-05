import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Copy, Bot } from "lucide-react";
import { toast } from "sonner";

interface CommandConfig {
  name: string;
  description: string;
  action: string;
  jsonBody: string;
  responseVariable: string;
  notes?: string;
}

const commands: CommandConfig[] = [
  {
    name: "/link",
    description: "Check if Discord is linked to Eclipse",
    action: "link",
    jsonBody: `{
  "action": "link",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}"
}`,
    responseVariable: "{link.response.message}",
    notes: "Shows link status and instructions if not linked",
  },
  {
    name: "/verify",
    description: "Link Discord using a code from Eclipse",
    action: "verify_code",
    jsonBody: `{
  "action": "verify_code",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}",
  "code": "{option_code}"
}`,
    responseVariable: "{link.response.message}",
    notes: "Add a 'code' option (string, required) to the command",
  },
  {
    name: "/profile",
    description: "View linked account profile",
    action: "profile",
    jsonBody: `{
  "action": "profile",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}"
}`,
    responseVariable: "{profile.response.message}",
    notes: "Add a Link Button after the embed. Set URL to: {profile.response.button_url} and Label to: Manage my Account",
  },
  {
    name: "/purchases",
    description: "View purchase history",
    action: "purchases",
    jsonBody: `{
  "action": "purchases",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}"
}`,
    responseVariable: "{link.response.message}",
  },
  {
    name: "/retrieve",
    description: "Get download link for a product (sent via DM)",
    action: "download",
    jsonBody: `{
  "action": "download",
  "discord_id": "{User.id}",
  "discord_username": "{User.username}",
  "product_name": "{option_product}"
}`,
    responseVariable: "{retrieve.response.message}",
    notes: "Add a 'product' option (string, optional). Set response to 'Send as DM'. Add Link Button with URL: {retrieve.response.button_url}",
  },
];

const CopyButton = ({ text, label }: { text: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="h-8 gap-1.5"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
};

export const BotGhostCommandReference = () => {
  const endpointUrl = "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/botghost-customer-api";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            BotGhost Command Setup
          </CardTitle>
          <CardDescription>
            Use these configurations for each BotGhost HTTP Request command
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Shared Configuration */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <h4 className="font-medium text-sm">Shared Configuration (same for all commands)</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Endpoint URL:</span>
                <CopyButton text={endpointUrl} label="URL" />
              </div>
              <code className="block text-xs bg-background p-2 rounded border break-all">
                {endpointUrl}
              </code>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Method:</span>
                <CopyButton text="POST" label="Method" />
              </div>
              <code className="block text-xs bg-background p-2 rounded border">POST</code>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Headers:</span>
                <CopyButton 
                  text={`Content-Type: application/json\nx-api-key: YOUR_API_KEY`} 
                  label="Headers" 
                />
              </div>
              <code className="block text-xs bg-background p-2 rounded border whitespace-pre">
                {`Content-Type: application/json\nx-api-key: YOUR_API_KEY`}
              </code>
            </div>

            <div className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ⚠️ Enable "Replace variables in body" and "Replace variables in HTTP Headers" in BotGhost
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Commands */}
      {commands.map((cmd) => (
        <Card key={cmd.action}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{cmd.name}</CardTitle>
            <CardDescription>{cmd.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">JSON Body:</span>
                <CopyButton text={cmd.jsonBody} label="JSON body" />
              </div>
              <pre className="text-xs bg-muted p-3 rounded-lg border overflow-x-auto">
                {cmd.jsonBody}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Response Variable:</span>
                <CopyButton text={cmd.responseVariable} label="Response variable" />
              </div>
              <code className="block text-xs bg-muted p-2 rounded border">
                {cmd.responseVariable}
              </code>
            </div>

            {cmd.notes && (
              <p className="text-xs text-muted-foreground bg-blue-500/10 p-2 rounded border border-blue-500/20">
                💡 {cmd.notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
