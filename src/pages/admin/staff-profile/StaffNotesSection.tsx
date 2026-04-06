import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { StickyNote, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import type { StaffNote } from './useStaffProfileData';
import type { UseMutationResult } from '@tanstack/react-query';

const NOTE_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'performance', label: 'Performance' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'warning', label: 'Warning' },
  { value: 'commendation', label: 'Commendation' },
];

const NOTE_TYPE_COLORS: Record<string, string> = {
  general: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  performance: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  feedback: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  commendation: 'bg-green-500/20 text-green-400 border-green-500/30',
};

interface StaffNotesSectionProps {
  staffNotes: StaffNote[];
  notesLoading: boolean;
  currentUserId: string | undefined;
  addNoteMutation: UseMutationResult<void, Error, { content: string; noteType: string }>;
  deleteNoteMutation: UseMutationResult<void, Error, string>;
}

export function StaffNotesSection({
  staffNotes,
  notesLoading,
  currentUserId,
  addNoteMutation,
  deleteNoteMutation,
}: StaffNotesSectionProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteType, setNewNoteType] = useState('general');
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    addNoteMutation.mutate(
      { content: newNoteContent.trim(), noteType: newNoteType },
      {
        onSuccess: () => {
          setNewNoteContent('');
          setNewNoteType('general');
          setIsAddingNote(false);
        },
      }
    );
  };

  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
          <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Internal Notes
          </h3>
          {!isAddingNote && (
            <Button size="sm" onClick={() => setIsAddingNote(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </div>
        <div className="p-4 space-y-4">
          {isAddingNote && (
            <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
              <Select value={newNoteType} onValueChange={setNewNoteType}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                placeholder="Enter your note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setIsAddingNote(false); setNewNoteContent(''); setNewNoteType('general'); }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddNote} disabled={addNoteMutation.isPending}>
                  {addNoteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Save Note
                </Button>
              </div>
            </div>
          )}

          {notesLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse p-4 rounded-lg bg-muted/30">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-3 w-full bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : staffNotes.length === 0 ? (
            <div className="text-center py-8">
              <StickyNote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No notes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Add internal notes for performance tracking</p>
            </div>
          ) : (
            <div className="space-y-3">
              {staffNotes.map(note => (
                <div key={note.id} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs ${NOTE_TYPE_COLORS[note.note_type] || NOTE_TYPE_COLORS.general}`}>
                        {NOTE_TYPES.find(t => t.value === note.note_type)?.label || 'General'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">by {note.author_name}</span>
                    </div>
                    {note.author_id === currentUserId && (
                      <Button variant="ghost" size="icon" aria-label="Delete" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setNoteToDelete(note.id)} disabled={deleteNoteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!noteToDelete} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this note? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (noteToDelete) { deleteNoteMutation.mutate(noteToDelete); setNoteToDelete(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
