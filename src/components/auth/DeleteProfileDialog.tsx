import { useState } from 'react';
import { Trash2, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
  onDeleted: () => void;
}

export function DeleteProfileDialog({
  open,
  onOpenChange,
  userEmail,
  onDeleted,
}: DeleteProfileDialogProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmData, setConfirmData] = useState(false);
  const [confirmDownloads, setConfirmDownloads] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canDelete = password.length >= 6 && confirmData && confirmDownloads;

  const handleDelete = async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    try {
      // Re-authenticate with password to verify identity
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password,
      });

      if (signInError) {
        toast.error('Incorrect password. Please try again.');
        setIsDeleting(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Unable to verify your identity.');
        setIsDeleting(false);
        return;
      }

      // Delete user data in order (respecting foreign key constraints)
      // 1. Delete download logs
      await supabase.from('download_logs').delete().eq('user_id', user.id);
      
      // 2. Delete order items for user's orders
      const { data: userOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id);
      
      if (userOrders && userOrders.length > 0) {
        const orderIds = userOrders.map(o => o.id);
        await supabase.from('order_items').delete().in('order_id', orderIds);
      }
      
      // 3. Delete orders
      await supabase.from('orders').delete().eq('user_id', user.id);
      
      // 4. Delete reviews
      await supabase.from('reviews').delete().eq('user_id', user.id);
      
      // 5. Delete forum posts
      await supabase.from('forum_posts').delete().eq('user_id', user.id);
      
      // 6. Delete forum threads
      await supabase.from('forum_threads').delete().eq('user_id', user.id);
      
      // 7. Delete forum chat messages
      await supabase.from('forum_chat_messages').delete().eq('user_id', user.id);
      
      // 8. Delete chat messages
      await supabase.from('chat_messages').delete().eq('sender_id', user.id);
      
      // 9. Delete chat conversations
      await supabase.from('chat_conversations').delete().eq('user_id', user.id);
      
      // 10. Delete support tickets messages and tickets
      const { data: userTickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id);
      
      if (userTickets && userTickets.length > 0) {
        const ticketIds = userTickets.map(t => t.id);
        await supabase.from('ticket_messages').delete().in('ticket_id', ticketIds);
      }
      await supabase.from('support_tickets').delete().eq('user_id', user.id);
      
      // 11. Delete profile
      await supabase.from('profiles').delete().eq('user_id', user.id);

      // Sign out the user
      await supabase.auth.signOut();

      toast.success('Your account and all associated data have been deleted.');
      onDeleted();
    } catch (error) {
      console.error('Error deleting profile:', error);
      toast.error('Failed to delete account. Please try again or contact support.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setPassword('');
      setShowPassword(false);
      setConfirmData(false);
      setConfirmDownloads(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Account
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete your account and remove all your data from our servers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              The following will be permanently deleted:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Your profile and account information</li>
              <li>All order history and purchase records</li>
              <li>All download history and access to purchased assets</li>
              <li>All reviews, forum posts, and messages</li>
              <li>All support tickets and chat history</li>
            </ul>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm-data"
                checked={confirmData}
                onCheckedChange={(checked) => setConfirmData(checked === true)}
              />
              <Label htmlFor="confirm-data" className="text-sm leading-tight cursor-pointer">
                I understand that all my account data will be permanently deleted
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="confirm-downloads"
                checked={confirmDownloads}
                onCheckedChange={(checked) => setConfirmDownloads(checked === true)}
              />
              <Label htmlFor="confirm-downloads" className="text-sm leading-tight cursor-pointer">
                I understand I will lose access to all my downloads and purchased assets
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Confirm your password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDeleting}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || isDeleting}
            className="sm:flex-1"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
