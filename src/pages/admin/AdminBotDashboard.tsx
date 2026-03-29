import { AdminLayout } from '@/components/admin/AdminLayout';
import { BotStatusCard } from '@/components/admin/bot/BotStatusCard';
import { BotServersCard } from '@/components/admin/bot/BotServersCard';
import { BotRolesCard } from '@/components/admin/bot/BotRolesCard';
import { BotCommandsCard } from '@/components/admin/bot/BotCommandsCard';
import { BotActionsCard } from '@/components/admin/bot/BotActionsCard';
import { BotSettingsCard } from '@/components/admin/bot/BotSettingsCard';
import { BotErrorLogsCard } from '@/components/admin/bot/BotErrorLogsCard';
import { Bot } from 'lucide-react';

export default function AdminBotDashboard() {
  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-3">
            <Bot className="h-7 w-7" />
            Portal Bot Control
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage the Eclipse Portal Bot — servers, roles, commands, and settings
          </p>
        </div>

        {/* Status + Servers */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BotStatusCard />
          <BotServersCard />
        </div>

        {/* Roles + Commands */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BotRolesCard />
          <BotCommandsCard />
        </div>

        {/* Actions + Settings */}
        <div className="grid gap-6 lg:grid-cols-2">
          <BotActionsCard />
          <BotSettingsCard />
        </div>

        {/* Error Logs - full width */}
        <BotErrorLogsCard />
      </div>
    </AdminLayout>
  );
}
