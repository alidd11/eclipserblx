import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Search, MoreVertical, Ban, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { GlobalBan } from '@/types/global-guard';

interface BanListTableProps {
  bans: GlobalBan[];
  isLoading?: boolean;
  onRevoke?: (banId: string) => void;
  onDelete?: (banId: string) => void;
}

export function BanListTable({ bans, isLoading, onRevoke, onDelete }: BanListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBans = bans.filter((ban) => {
    const query = searchQuery.toLowerCase();
    return (
      ban.banned_discord_id.includes(query) ||
      ban.banned_username?.toLowerCase().includes(query) ||
      ban.reason?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (ban: GlobalBan) => {
    if (!ban.is_active) {
      return <Badge variant="secondary" className="bg-muted text-muted-foreground">Revoked</Badge>;
    }
    if (ban.ban_type === 'temporary' && ban.expires_at) {
      const expiresAt = new Date(ban.expires_at);
      if (expiresAt < new Date()) {
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Expired</Badge>;
      }
      return (
        <Badge variant="outline" className="border-amber-500/50 text-amber-400">
          <Clock className="w-3 h-3 mr-1" />
          Temporary
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
        <Ban className="w-3 h-3 mr-1" />
        Permanent
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by Discord ID, username, or reason..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-background border-border"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="text-muted-foreground">User</TableHead>
              <TableHead className="text-muted-foreground">Reason</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground">Created</TableHead>
              <TableHead className="text-muted-foreground w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {searchQuery ? 'No bans match your search' : 'No bans yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredBans.map((ban) => (
                <TableRow key={ban.id} className="border-border">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={ban.banned_avatar_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {ban.banned_username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {ban.banned_username || 'Unknown User'}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {ban.banned_discord_id}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="text-sm text-muted-foreground truncate">
                      {ban.reason || 'No reason provided'}
                    </p>
                  </TableCell>
                  <TableCell>{getStatusBadge(ban)}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(ban.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {ban.is_active && onRevoke && (
                          <DropdownMenuItem onClick={() => onRevoke(ban.id)}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Revoke Ban
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem 
                            onClick={() => onDelete(ban.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
