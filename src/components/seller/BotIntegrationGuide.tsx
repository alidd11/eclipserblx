import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Book, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Code,
  Zap,
  Shield,
  Users,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BotIntegrationGuideProps {
  storeId?: string;
  apiEndpoint: string;
}

export function BotIntegrationGuide({ storeId, apiEndpoint }: BotIntegrationGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const pythonExample = `import requests

ECLIPSE_API = "${apiEndpoint}"
STORE_ID = "${storeId || 'YOUR_STORE_ID'}"

def validate_license(installation_code: str, guild_id: str, guild_name: str) -> dict:
    """Validate a license code when bot joins a server."""
    response = requests.post(
        ECLIPSE_API,
        headers={
            "Content-Type": "application/json",
            "x-seller-id": STORE_ID
        },
        json={
            "action": "validate",
            "installation_code": installation_code,
            "guild_id": guild_id,
            "guild_name": guild_name
        }
    )
    return response.json()

# Example: On bot guild join event
@bot.event
async def on_guild_join(guild):
    # Prompt the server owner to enter their license code
    # Then validate it:
    result = validate_license("BOT-XXXX-XXXX-XXXX", str(guild.id), guild.name)
    
    if result.get("success"):
        print(f"✅ License activated for {guild.name}")
    else:
        print(f"❌ Invalid license: {result.get('error')}")
        await guild.leave()  # Leave if license is invalid`;

  const javascriptExample = `const ECLIPSE_API = "${apiEndpoint}";
const STORE_ID = "${storeId || 'YOUR_STORE_ID'}";

async function validateLicense(installationCode, guildId, guildName) {
  const response = await fetch(ECLIPSE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-seller-id': STORE_ID
    },
    body: JSON.stringify({
      action: 'validate',
      installation_code: installationCode,
      guild_id: guildId,
      guild_name: guildName
    })
  });
  return response.json();
}

// Example: Discord.js v14
client.on('guildCreate', async (guild) => {
  // Prompt owner for license code, then validate:
  const result = await validateLicense('BOT-XXXX-XXXX-XXXX', guild.id, guild.name);
  
  if (result.success) {
    console.log(\`✅ License activated for \${guild.name}\`);
  } else {
    console.log(\`❌ Invalid license: \${result.error}\`);
    await guild.leave(); // Leave if license is invalid
  }
});`;

  const checkLicenseExample = `// Check if a guild has a valid license
async function checkGuildLicense(guildId) {
  const response = await fetch(ECLIPSE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-seller-id': STORE_ID
    },
    body: JSON.stringify({
      action: 'check',
      guild_id: guildId
    })
  });
  return response.json();
}

// Returns: { valid: true/false, expires_at: "2025-12-31T23:59:59Z" }`;

  return (
    <Card className="border-primary/20">
      <CardHeader 
        className="cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Book className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Integration Guide</CardTitle>
              <CardDescription>
                Learn how to integrate Eclipse licensing into your Discord bot
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon">
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-0">
          {/* How It Works */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              How It Works
            </h3>
            <div className="grid gap-3">
              {[
                { step: 1, title: 'Register Your Bot', desc: 'Add your Discord Application ID and configure permissions' },
                { step: 2, title: 'Create a Product', desc: 'List your bot on the marketplace with pricing' },
                { step: 3, title: 'Customer Purchases', desc: 'They receive a unique installation code (BOT-XXXX-XXXX-XXXX)' },
                { step: 4, title: 'OAuth Installation', desc: 'Customer clicks "Add to Server" to install via Discord OAuth' },
                { step: 5, title: 'License Validation', desc: 'Your bot calls our API to validate and activate the license' },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="outline" className="mt-0.5">{item.step}</Badge>
                  <div>
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* API Reference */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              API Reference
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg border bg-background">
                <div className="flex items-center justify-between mb-2">
                  <Badge>POST</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(apiEndpoint, 'api')}
                  >
                    {copiedField === 'api' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
                <code className="text-xs break-all">{apiEndpoint}</code>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Required Headers</p>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <code className="text-primary">x-seller-id</code>
                    <span className="text-muted-foreground">— Your store ID ({storeId || 'STR-XXXXXX'})</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <code className="text-primary">Content-Type</code>
                    <span className="text-muted-foreground">— application/json</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Actions</p>
                <div className="grid gap-2">
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">validate</Badge>
                      <span className="text-sm font-medium">Activate a license</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Call this when a customer provides their installation code. Validates and permanently binds the license to a guild.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">check</Badge>
                      <span className="text-sm font-medium">Verify license status</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Call this on bot startup to verify a guild still has a valid license. Returns expiration info.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Examples */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Code className="h-4 w-4 text-primary" />
              Code Examples
            </h3>

            <Tabs defaultValue="javascript" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                <TabsTrigger value="python">Python</TabsTrigger>
              </TabsList>
              
              <TabsContent value="javascript" className="space-y-3">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(javascriptExample, 'js')}
                  >
                    {copiedField === 'js' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-80">
                    <code>{javascriptExample}</code>
                  </pre>
                </div>
                
                <div className="relative">
                  <p className="text-sm font-medium mb-2">Check License Status</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-8 right-2 z-10"
                    onClick={() => copyToClipboard(checkLicenseExample, 'check')}
                  >
                    {copiedField === 'check' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto">
                    <code>{checkLicenseExample}</code>
                  </pre>
                </div>
              </TabsContent>
              
              <TabsContent value="python">
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => copyToClipboard(pythonExample, 'py')}
                  >
                    {copiedField === 'py' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <pre className="text-xs bg-muted rounded-lg p-4 overflow-x-auto max-h-96">
                    <code>{pythonExample}</code>
                  </pre>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Best Practices */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Best Practices
            </h3>
            <div className="grid gap-2">
              {[
                'Validate licenses on bot startup and periodically (e.g., every 24h)',
                'Cache license status locally to reduce API calls',
                'Handle API errors gracefully—don\'t kick users for temporary failures',
                'Provide clear instructions to customers on how to enter their code',
                'Consider a grace period for expired licenses before disabling features',
              ].map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Response Examples */}
          <Alert>
            <AlertDescription className="space-y-3">
              <p className="font-medium">API Response Examples</p>
              <div className="grid gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-green-500/10 border border-green-500/30">
                  <span className="text-green-500">Success:</span>
                  {` { "success": true, "guild_id": "123...", "activated_at": "2025-02-04T..." }`}
                </div>
                <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                  <span className="text-destructive">Error:</span>
                  {` { "success": false, "error": "Invalid or expired installation code" }`}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
