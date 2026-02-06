import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileCode, FileJson, FileText, FileType, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const FLY_TOML = `app = "eclipse-support-bot"
primary_region = "lhr"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"`;

const INDEX_JS = `import { Client, GatewayIntentBits, EmbedBuilder, ChannelType } from 'discord.js';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const DISCORD_TOKEN = process.env.DISCORD_CUSTOMER_BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Validate environment
if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables!');
  console.error('Required: DISCORD_CUSTOMER_BOT_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Initialize Discord client with DM intents
const client = new Client({
  intents: [
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL', 'MESSAGE'],
});

// Branding
const ECLIPSE_COLOR = 0x8B5CF6; // Purple
const ECLIPSE_ICON = 'https://qlnbergwjfrmgkjhrbkj.supabase.co/storage/v1/object/public/product-images/eclipse-logo.png';

/**
 * Find an open ticket for a Discord user
 */
async function findOpenTicket(discordUserId) {
  const { data, error } = await supabase
    .from('discord_modmail_tickets')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .in('status', ['open', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error finding ticket:', error);
    return null;
  }

  return data;
}

/**
 * Add a message to an existing ticket
 */
async function addMessageToTicket(ticketId, content, discordMessageId, attachments = null) {
  const { data, error } = await supabase
    .from('discord_modmail_messages')
    .insert({
      ticket_id: ticketId,
      content,
      discord_message_id: discordMessageId,
      is_staff_reply: false,
      attachments,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding message:', error);
    return null;
  }

  // Update ticket timestamp
  await supabase
    .from('discord_modmail_tickets')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', ticketId);

  return data;
}

/**
 * Send notification to staff channel via webhook
 */
async function notifyStaff(ticket, message, username, avatarUrl) {
  if (!DISCORD_WEBHOOK_URL) return;

  try {
    const embed = {
      title: '💬 New Customer Reply',
      description: message.length > 500 ? message.substring(0, 500) + '...' : message,
      color: ECLIPSE_COLOR,
      author: {
        name: username,
        icon_url: avatarUrl,
      },
      fields: [
        {
          name: 'Ticket Subject',
          value: ticket.subject || 'No subject',
          inline: true,
        },
        {
          name: 'Status',
          value: ticket.status === 'in_progress' ? '🔄 In Progress' : '📩 Open',
          inline: true,
        },
      ],
      footer: {
        text: \`Ticket ID: \${ticket.id.substring(0, 8)}\`,
        icon_url: ECLIPSE_ICON,
      },
      timestamp: new Date().toISOString(),
    };

    await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    });
  } catch (error) {
    console.error('Error notifying staff:', error);
  }
}

/**
 * Send confirmation embed to user
 */
async function sendConfirmation(channel, ticket) {
  const embed = new EmbedBuilder()
    .setColor(ECLIPSE_COLOR)
    .setTitle('✅ Message Received')
    .setDescription('Your reply has been added to your support ticket. Our team will respond as soon as possible.')
    .addFields({
      name: 'Ticket Subject',
      value: ticket.subject || 'Support Request',
      inline: true,
    })
    .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

/**
 * Send "no ticket" message
 */
async function sendNoTicketMessage(channel) {
  const embed = new EmbedBuilder()
    .setColor(0xEF4444) // Red
    .setTitle('❌ No Open Ticket')
    .setDescription('You don\\'t have an open support ticket. To create one, use the \`/support\` command in the Eclipse Discord server.')
    .setFooter({ text: 'Eclipse Support', iconURL: ECLIPSE_ICON })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

// Handle incoming messages
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  // Only process DMs
  if (message.channel.type !== ChannelType.DM) return;

  console.log(\`[DM] \${message.author.tag}: \${message.content}\`);

  try {
    // Find open ticket for this user
    const ticket = await findOpenTicket(message.author.id);

    if (!ticket) {
      await sendNoTicketMessage(message.channel);
      return;
    }

    // Process attachments
    const attachments = message.attachments.size > 0
      ? Array.from(message.attachments.values()).map(a => ({
          url: a.url,
          name: a.name,
          contentType: a.contentType,
        }))
      : null;

    // Add message to ticket
    const savedMessage = await addMessageToTicket(
      ticket.id,
      message.content || '[Attachment]',
      message.id,
      attachments
    );

    if (savedMessage) {
      // Send confirmation to user
      await sendConfirmation(message.channel, ticket);

      // Notify staff
      await notifyStaff(
        ticket,
        message.content || '[Attachment]',
        message.author.username,
        message.author.displayAvatarURL()
      );

      console.log(\`[SUCCESS] Message added to ticket \${ticket.id}\`);
    } else {
      await message.channel.send('❌ Failed to save your message. Please try again or use \`/support\` to create a new ticket.');
    }
  } catch (error) {
    console.error('Error handling DM:', error);
    await message.channel.send('❌ An error occurred. Please try again later.');
  }
});

// Bot ready
client.once('ready', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(\`🟢 Eclipse Support Bot is online!\`);
  console.log(\`   Logged in as: \${client.user.tag}\`);
  console.log(\`   Listening for DMs...\`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
});

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Login
client.login(DISCORD_TOKEN);`;

const PACKAGE_JSON = `{
  "name": "eclipse-support-bot",
  "version": "1.0.0",
  "description": "Persistent Discord bot for modmail DM handling",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "discord.js": "^14.14.1",
    "@supabase/supabase-js": "^2.39.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}`;

const README = `# Eclipse Support Bot

A persistent Discord bot that allows customers to reply to modmail tickets directly via DM, without needing the \`/reply\` command.

## How It Works

1. Customer opens a ticket via \`/support\` slash command
2. Staff responds via the admin dashboard
3. Customer receives a DM with the response
4. **Customer can now reply directly to the DM** (this bot handles it)
5. The reply is added to the ticket and staff are notified

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| \`DISCORD_CUSTOMER_BOT_TOKEN\` | Your Discord bot token |
| \`SUPABASE_URL\` | Your Supabase project URL |
| \`SUPABASE_SERVICE_ROLE_KEY\` | Supabase service role key (for database access) |
| \`DISCORD_WEBHOOK_URL\` | (Optional) Webhook for staff notifications |

## Deploy to Railway

1. Create a new project on [Railway](https://railway.app)
2. Connect this folder as a GitHub repo or use Railway CLI
3. Add the environment variables above
4. Deploy!

### Quick Deploy via Railway CLI

\`\`\`bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add environment variables
railway variables set DISCORD_CUSTOMER_BOT_TOKEN=your_token_here
railway variables set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
railway variables set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
railway variables set DISCORD_WEBHOOK_URL=your_webhook_url

# Deploy
railway up
\`\`\`

## Deploy to Fly.io

1. Install [flyctl](https://fly.io/docs/hands-on/install-flyctl/)
2. Create a \`fly.toml\` file (see below)
3. Run \`fly deploy\`

### fly.toml

\`\`\`toml
app = "eclipse-support-bot"
primary_region = "lhr"

[build]
  builder = "heroku/buildpacks:20"

[env]
  NODE_ENV = "production"

[[services]]
  internal_port = 8080
  protocol = "tcp"
\`\`\`

Then set secrets:

\`\`\`bash
fly secrets set DISCORD_CUSTOMER_BOT_TOKEN=your_token_here
fly secrets set SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
fly secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
fly secrets set DISCORD_WEBHOOK_URL=your_webhook_url
\`\`\`

## Discord Bot Settings

Make sure your Discord bot has these settings in the [Discord Developer Portal](https://discord.com/developers/applications):

### Required Intents (Bot → Privileged Gateway Intents)
- ✅ **Message Content Intent** - Required to read DM content
- ✅ **Direct Messages** - Required to receive DMs

### Bot Permissions
The bot only needs basic permissions since it just reads/sends DMs.

## Local Development

\`\`\`bash
# Install dependencies
npm install

# Set environment variables
export DISCORD_CUSTOMER_BOT_TOKEN=your_token
export SUPABASE_URL=https://qlnbergwjfrmgkjhrbkj.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your_key
export DISCORD_WEBHOOK_URL=your_webhook

# Run
npm start
\`\`\`

## Troubleshooting

### Bot not receiving DMs
1. Ensure **Message Content Intent** is enabled in Discord Developer Portal
2. Check that the bot is online (green status)
3. Verify the bot token is correct

### Messages not saving
1. Check Supabase service role key is valid
2. Verify the \`discord_modmail_tickets\` and \`discord_modmail_messages\` tables exist
3. Check Railway/Fly.io logs for errors

### Staff not getting notified
1. Verify \`DISCORD_WEBHOOK_URL\` is set correctly
2. Check that the webhook is still active in Discord`;

interface FileTab {
  id: string;
  name: string;
  icon: typeof FileCode;
  content: string;
  language: string;
}

const FILES: FileTab[] = [
  { id: "index", name: "index.js", icon: FileCode, content: INDEX_JS, language: "javascript" },
  { id: "package", name: "package.json", icon: FileJson, content: PACKAGE_JSON, language: "json" },
  { id: "fly", name: "fly.toml", icon: FileType, content: FLY_TOML, language: "toml" },
  { id: "readme", name: "README.md", icon: FileText, content: README, language: "markdown" },
];

export function BotFilesTab() {
  const [activeFile, setActiveFile] = useState("index");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = (content: string, fileName: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    toast.success(`${fileName} copied to clipboard`);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${fileName} downloaded`);
  };

  const downloadAll = () => {
    FILES.forEach((file) => {
      downloadFile(file.content, file.name);
    });
    toast.success("All files downloaded");
  };

  const currentFile = FILES.find((f) => f.id === activeFile) || FILES[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Persistent Bot Files
              </CardTitle>
              <CardDescription className="mt-1">
                Deploy this bot to enable natural DM replies (no /reply command needed)
              </CardDescription>
            </div>
            <Button onClick={downloadAll} size="sm" className="w-full sm:w-auto">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeFile} onValueChange={setActiveFile}>
            <div className="border-b px-4">
              <TabsList className="h-10 w-full justify-start bg-transparent p-0 gap-0">
                {FILES.map((file) => {
                  const Icon = file.icon;
                  return (
                    <TabsTrigger
                      key={file.id}
                      value={file.id}
                      className="relative h-10 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 text-xs sm:text-sm"
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      <span className="hidden xs:inline">{file.name}</span>
                      <span className="xs:hidden">{file.name.split('.')[0]}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {FILES.map((file) => (
              <TabsContent key={file.id} value={file.id} className="m-0">
                <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {file.language}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {file.content.split('\n').length} lines
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(file.content, file.name)}
                      className="h-7 px-2"
                    >
                      {copiedFile === file.name ? (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(file.content, file.name)}
                      className="h-7 px-2"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[300px] sm:h-[400px]">
                  <pre className="p-4 text-xs sm:text-sm font-mono whitespace-pre-wrap break-all">
                    <code>{file.content}</code>
                  </pre>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Setup Guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">1</Badge>
            <p>Download all files and create a new folder on your computer</p>
          </div>
          <div className="flex gap-3">
            <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">2</Badge>
            <p>Deploy to Railway or Fly.io (see README for instructions)</p>
          </div>
          <div className="flex gap-3">
            <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">3</Badge>
            <div>
              <p>Set environment variables:</p>
              <ul className="list-disc list-inside text-muted-foreground mt-1 ml-2 space-y-0.5">
                <li><code className="text-xs bg-muted px-1 rounded">DISCORD_CUSTOMER_BOT_TOKEN</code></li>
                <li><code className="text-xs bg-muted px-1 rounded">SUPABASE_URL</code></li>
                <li><code className="text-xs bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code></li>
                <li><code className="text-xs bg-muted px-1 rounded">DISCORD_WEBHOOK_URL</code> (optional)</li>
              </ul>
            </div>
          </div>
          <div className="flex gap-3">
            <Badge className="shrink-0 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">4</Badge>
            <p>Enable <strong>Message Content Intent</strong> in Discord Developer Portal</p>
          </div>
          <div className="pt-2">
            <Button variant="outline" size="sm" asChild>
              <a href="https://railway.app" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                Open Railway
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
