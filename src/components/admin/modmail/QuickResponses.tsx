import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface QuickResponse {
  id: string;
  label: string;
  content: string;
}

const DEFAULT_RESPONSES: QuickResponse[] = [
  {
    id: "greeting",
    label: "Greeting",
    content: "Hi there! Thank you for reaching out to Eclipse Support. How can I help you today?",
  },
  {
    id: "investigating",
    label: "Investigating",
    content: "Thank you for bringing this to our attention. I'm looking into this now and will get back to you shortly.",
  },
  {
    id: "more-info",
    label: "Need More Info",
    content: "Could you please provide some more details about the issue? Any screenshots or error messages would be helpful.",
  },
  {
    id: "resolved",
    label: "Issue Resolved",
    content: "I'm glad we could help resolve this issue! Is there anything else I can assist you with?",
  },
  {
    id: "partnership",
    label: "Partnership Inquiry",
    content: "Thank you for your interest in partnering with Eclipse! I've forwarded your request to our partnerships team and they will be in touch soon.",
  },
  {
    id: "closing",
    label: "Closing",
    content: "Thank you for contacting Eclipse Support. If you have any more questions in the future, don't hesitate to reach out. Have a great day!",
  },
];

interface QuickResponsesProps {
  onSelect: (content: string) => void;
  disabled?: boolean;
}

export function QuickResponses({ onSelect, disabled }: QuickResponsesProps) {
  const [open, setOpen] = useState(false);
  const [responses, setResponses] = useState<QuickResponse[]>(() => {
    const saved = localStorage.getItem("modmail-quick-responses");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return DEFAULT_RESPONSES;
      }
    }
    return DEFAULT_RESPONSES;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newContent, setNewContent] = useState("");

  const saveResponses = (newResponses: QuickResponse[]) => {
    setResponses(newResponses);
    localStorage.setItem("modmail-quick-responses", JSON.stringify(newResponses));
  };

  const handleSelect = (response: QuickResponse) => {
    onSelect(response.content);
    setOpen(false);
  };

  const handleEdit = (response: QuickResponse) => {
    setEditingId(response.id);
    setEditLabel(response.label);
    setEditContent(response.content);
  };

  const handleSaveEdit = () => {
    if (!editLabel.trim() || !editContent.trim()) {
      toast.error("Label and content are required");
      return;
    }
    const updated = responses.map((r) =>
      r.id === editingId ? { ...r, label: editLabel.trim(), content: editContent.trim() } : r
    );
    saveResponses(updated);
    setEditingId(null);
    toast.success("Quick response updated");
  };

  const handleDelete = (id: string) => {
    const updated = responses.filter((r) => r.id !== id);
    saveResponses(updated);
    toast.success("Quick response deleted");
  };

  const handleAdd = () => {
    if (!newLabel.trim() || !newContent.trim()) {
      toast.error("Label and content are required");
      return;
    }
    const newResponse: QuickResponse = {
      id: `custom-${Date.now()}`,
      label: newLabel.trim(),
      content: newContent.trim(),
    };
    saveResponses([...responses, newResponse]);
    setNewLabel("");
    setNewContent("");
    setIsAdding(false);
    toast.success("Quick response added");
  };

  const handleReset = () => {
    saveResponses(DEFAULT_RESPONSES);
    toast.success("Quick responses reset to defaults");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={disabled}
          title="Quick Responses"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-medium text-sm">Quick Responses</h4>
          <p className="text-xs text-muted-foreground">Click to insert a response</p>
        </div>
        <ScrollArea className="max-h-[300px]">
          <div className="p-2 space-y-1">
            {responses.map((response) => (
              <div key={response.id}>
                {editingId === response.id ? (
                  <div className="p-2 border rounded-lg space-y-2">
                    <Input
                      placeholder="Label"
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Textarea
                      placeholder="Content"
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px] text-sm resize-none"
                    />
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="default"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleSaveEdit}
                      >
                        <Save className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start h-auto py-2 px-3 text-left"
                      onClick={() => handleSelect(response)}
                    >
                      <div>
                        <div className="font-medium text-sm">{response.label}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {response.content}
                        </div>
                      </div>
                    </Button>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEdit(response)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(response.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isAdding && (
              <div className="p-2 border rounded-lg space-y-2 mt-2">
                <Input
                  placeholder="Label (e.g., 'Greeting')"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="h-8 text-sm"
                />
                <Textarea
                  placeholder="Response content..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[60px] text-sm resize-none"
                />
                <div className="flex gap-1 justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => {
                      setIsAdding(false);
                      setNewLabel("");
                      setNewContent("");
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleAdd}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t flex gap-2">
          {!isAdding && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add New
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground"
          >
            Reset
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
