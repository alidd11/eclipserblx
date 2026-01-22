"""
Dashboard Webhook Cog for Modmail Bot
=====================================
This cog handles incoming DMs from users and forwards them to the 
Lovable admin dashboard via webhook.

Add this file to your `cogs/` folder and load it in your bot.

Configuration required in your bot config:
- DASHBOARD_WEBHOOK_URL: Your Lovable edge function URL
- DASHBOARD_WEBHOOK_SECRET: The secret key for authentication
"""

import asyncio
import aiohttp
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

import discord
from discord.ext import commands

from core.models import getLogger

logger = getLogger(__name__)


class DashboardWebhook(commands.Cog):
    """
    Forwards incoming modmail DMs to the Lovable admin dashboard.
    
    This cog listens for DMs from users and sends them to your
    Lovable webhook endpoint for display in the admin panel.
    """

    def __init__(self, bot):
        self.bot = bot
        self.session: Optional[aiohttp.ClientSession] = None
        
        # Configuration - set these in your bot config or environment
        self.webhook_url = self.bot.config.get(
            "dashboard_webhook_url",
            "https://qlnbergwjfrmgkjhrbkj.supabase.co/functions/v1/discord-modmail-webhook"
        )
        self.webhook_secret = self.bot.config.get(
            "dashboard_webhook_secret", 
            ""
        )

    async def cog_load(self):
        """Initialize HTTP session when cog loads."""
        self.session = aiohttp.ClientSession()
        logger.info("DashboardWebhook cog loaded - forwarding DMs to admin dashboard")

    async def cog_unload(self):
        """Cleanup HTTP session when cog unloads."""
        if self.session:
            await self.session.close()
        logger.info("DashboardWebhook cog unloaded")

    def _get_avatar_url(self, user: discord.User) -> Optional[str]:
        """Get the user's avatar URL or None."""
        if user.avatar:
            return str(user.avatar.url)
        return str(user.default_avatar.url)

    def _format_attachments(self, attachments: List[discord.Attachment]) -> List[Dict[str, str]]:
        """Format message attachments for the webhook payload."""
        return [
            {
                "url": att.url,
                "filename": att.filename,
                "content_type": att.content_type or "application/octet-stream",
                "size": att.size
            }
            for att in attachments
        ]

    async def send_to_dashboard(
        self,
        discord_user_id: str,
        discord_username: str,
        content: str,
        discord_avatar_url: Optional[str] = None,
        discord_message_id: Optional[str] = None,
        attachments: Optional[List[Dict[str, str]]] = None
    ) -> bool:
        """
        Send a message to the Lovable admin dashboard webhook.
        
        Returns True if successful, False otherwise.
        """
        if not self.session:
            logger.error("HTTP session not initialized")
            return False

        if not self.webhook_url:
            logger.warning("Dashboard webhook URL not configured")
            return False

        payload = {
            "discord_user_id": discord_user_id,
            "discord_username": discord_username,
            "content": content,
            "discord_avatar_url": discord_avatar_url,
            "discord_message_id": discord_message_id,
            "attachments": attachments or []
        }

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Secret": self.webhook_secret
        }

        try:
            async with self.session.post(
                self.webhook_url,
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10)
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(
                        f"Successfully forwarded DM to dashboard: "
                        f"user={discord_username}, ticket={result.get('ticket_id', 'unknown')}"
                    )
                    return True
                else:
                    error_text = await response.text()
                    logger.error(
                        f"Dashboard webhook failed with status {response.status}: {error_text}"
                    )
                    return False

        except asyncio.TimeoutError:
            logger.error("Dashboard webhook request timed out")
            return False
        except aiohttp.ClientError as e:
            logger.error(f"Dashboard webhook request failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending to dashboard: {e}", exc_info=True)
            return False

    @commands.Cog.listener()
    async def on_message(self, message: discord.Message):
        """
        Listen for DM messages and forward them to the dashboard.
        
        This works alongside the existing modmail functionality.
        """
        # Ignore bot messages
        if message.author.bot:
            return

        # Only process DMs
        if not isinstance(message.channel, discord.DMChannel):
            return

        # Don't process commands
        ctx = await self.bot.get_context(message)
        if ctx.valid:
            return

        # Check if the user is blocked (optional - depends on your bot's implementation)
        if hasattr(self.bot, 'blocked_users') and message.author.id in self.bot.blocked_users:
            return

        # Forward to dashboard webhook
        success = await self.send_to_dashboard(
            discord_user_id=str(message.author.id),
            discord_username=str(message.author),
            content=message.content or "(No text content)",
            discord_avatar_url=self._get_avatar_url(message.author),
            discord_message_id=str(message.id),
            attachments=self._format_attachments(message.attachments)
        )

        if not success:
            logger.warning(
                f"Failed to forward DM to dashboard from {message.author} (ID: {message.author.id})"
            )

    @commands.command(name="dashboard_status", aliases=["dstatus"])
    @commands.has_permissions(administrator=True)
    async def dashboard_status(self, ctx: commands.Context):
        """Check the dashboard webhook connection status."""
        embed = discord.Embed(
            title="Dashboard Webhook Status",
            color=discord.Color.blurple(),
            timestamp=datetime.now(timezone.utc)
        )

        embed.add_field(
            name="Webhook URL",
            value=f"```{self.webhook_url[:50]}...```" if self.webhook_url else "Not configured",
            inline=False
        )
        embed.add_field(
            name="Secret Configured",
            value="✅ Yes" if self.webhook_secret else "❌ No",
            inline=True
        )
        embed.add_field(
            name="Session Active",
            value="✅ Yes" if self.session and not self.session.closed else "❌ No",
            inline=True
        )

        # Test the webhook
        if self.webhook_url:
            try:
                async with self.session.get(
                    self.webhook_url.replace("/discord-modmail-webhook", "/health"),
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    if response.status == 200:
                        embed.add_field(
                            name="Connection Test",
                            value="✅ Endpoint reachable",
                            inline=False
                        )
                    else:
                        embed.add_field(
                            name="Connection Test",
                            value=f"⚠️ Status {response.status}",
                            inline=False
                        )
            except Exception as e:
                embed.add_field(
                    name="Connection Test",
                    value=f"❌ Failed: {str(e)[:50]}",
                    inline=False
                )

        await ctx.send(embed=embed)

    @commands.command(name="test_dashboard", aliases=["tdash"])
    @commands.has_permissions(administrator=True)
    async def test_dashboard(self, ctx: commands.Context, *, message: str = "Test message from bot"):
        """Send a test message to the dashboard webhook."""
        success = await self.send_to_dashboard(
            discord_user_id=str(ctx.author.id),
            discord_username=f"{ctx.author} (TEST)",
            content=f"[TEST] {message}",
            discord_avatar_url=self._get_avatar_url(ctx.author),
            discord_message_id=str(ctx.message.id)
        )

        if success:
            await ctx.send("✅ Test message sent to dashboard successfully!")
        else:
            await ctx.send("❌ Failed to send test message. Check bot logs for details.")


async def setup(bot):
    """Load the cog."""
    await bot.add_cog(DashboardWebhook(bot))
