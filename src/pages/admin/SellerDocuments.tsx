import { useState, useMemo } from "react";
import { FileText, Plus, Upload, ExternalLink, Trash2, Filter, Link as LinkIcon, Eye, EyeOff, Bell } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const DEFAULT_CATEGORIES = [
  { value: "general", label: "General", color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
  { value: "legal", label: "Legal", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { value: "policy", label: "Policy", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  { value: "guide", label: "Guide", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { value: "announcement", label: "Announcement", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { value: "training", label: "Training", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
];

const getCategoryColor = (category: string) => {
  const found = DEFAULT_CATEGORIES.find(c => c.value === category);
  return found?.color || "bg-muted text-muted-foreground";
};

const getCategoryLabel = (category: string) => {
  const found = DEFAULT_CATEGORIES.find(c => c.value === category);
  return found?.label || category.charAt(0).toUpperCase() + category.slice(1);
};

export default function AdminSellerDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    external_url: "",
    category: "general",
    requires_acknowledgement: false,
    is_active: true,
  });
  const [newCategory, setNewCategory] = useState("");
  const [sendNotification, setSendNotification] = useState(true);

  // Fetch documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["admin-seller-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Get unique categories from documents
  const allCategories = useMemo(() => {
    const docCategories = documents?.map(d => d.category) || [];
    const uniqueCategories = [...new Set([...DEFAULT_CATEGORIES.map(c => c.value), ...docCategories])];
    return uniqueCategories;
  }, [documents]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    if (!documents) return [];
    if (selectedCategory === "all") return documents;
    return documents.filter(doc => doc.category === selectedCategory);
  }, [documents, selectedCategory]);

  // Create document mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const categoryToUse = newCategory.trim() || formData.category;
      
      const { data: doc, error } = await supabase
        .from("seller_documents")
        .insert({
          title: formData.title,
          description: formData.description || null,
          external_url: formData.external_url || null,
          category: categoryToUse,
          requires_acknowledgement: formData.requires_acknowledgement,
          is_active: formData.is_active,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send notifications to all sellers if enabled
      if (sendNotification && formData.is_active) {
        // Create database notifications
        const { data: stores } = await supabase
          .from("stores")
          .select("id");

        if (stores && stores.length > 0) {
          const notifications = stores.map(store => ({
            document_id: doc.id,
            store_id: store.id,
          }));

          await supabase
            .from("seller_document_notifications")
            .insert(notifications);
        }

        // Send push notifications via edge function
        try {
          await supabase.functions.invoke("notify-seller-document", {
            body: {
              document_id: doc.id,
              title: formData.title,
              category: categoryToUse,
            },
          });
        } catch (pushError) {
          console.error("Failed to send push notifications:", pushError);
          // Don't throw - document was created successfully
        }
      }

      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-documents"] });
      toast.success("Document created and notifications sent to sellers");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create document");
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("seller_documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-documents"] });
      toast.success("Document deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete document");
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("seller_documents")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-seller-documents"] });
      toast.success("Document status updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update document");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      external_url: "",
      category: "general",
      requires_acknowledgement: false,
      is_active: true,
    });
    setNewCategory("");
    setSendNotification(true);
  };

  return (
    <AdminLayout requiredPermissions={['manage_sellers']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Seller Documents</h1>
            <p className="text-muted-foreground">
              Manage documents shared with all sellers on the marketplace
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Document
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Document</DialogTitle>
                <DialogDescription>
                  Create a new document to share with all sellers
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Document title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the document"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_url">External URL</Label>
                  <Input
                    id="external_url"
                    type="url"
                    value={formData.external_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, external_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-card">
                        {DEFAULT_CATEGORIES.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCategory">Or New Category</Label>
                    <Input
                      id="newCategory"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Custom category"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Requires Acknowledgement</Label>
                    <p className="text-xs text-muted-foreground">Sellers must confirm they've read this</p>
                  </div>
                  <Switch
                    checked={formData.requires_acknowledgement}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, requires_acknowledgement: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Active</Label>
                    <p className="text-xs text-muted-foreground">Document visible to sellers</p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Send Notification
                    </Label>
                    <p className="text-xs text-muted-foreground">Notify all sellers about this document</p>
                  </div>
                  <Switch
                    checked={sendNotification}
                    onCheckedChange={setSendNotification}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!formData.title || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Document"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                {selectedCategory === "all" ? "All Categories" : getCategoryLabel(selectedCategory)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100] bg-card">
              <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                All Categories
              </DropdownMenuItem>
              {allCategories.map(cat => (
                <DropdownMenuItem key={cat} onClick={() => setSelectedCategory(cat)}>
                  <Badge variant="outline" className={`${getCategoryColor(cat)} mr-2`}>
                    {getCategoryLabel(cat)}
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedCategory !== "all" && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCategory("all")}>
              Clear filter
            </Button>
          )}
        </div>

        {/* Documents Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-full mt-2" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className={`group transition-colors ${!doc.is_active ? "opacity-60" : "hover:border-primary/50"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getCategoryColor(doc.category)}>
                        {getCategoryLabel(doc.category)}
                      </Badge>
                      {!doc.is_active && (
                        <Badge variant="outline" className="bg-muted">Hidden</Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleActiveMutation.mutate({ id: doc.id, is_active: !doc.is_active })}
                      >
                        {doc.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(doc.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                  <CardTitle className="text-lg mt-2">{doc.title}</CardTitle>
                  {doc.description && (
                    <CardDescription className="line-clamp-2">{doc.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Created: {format(new Date(doc.created_at), "MMM d, yyyy")}</span>
                    {doc.external_url && (
                      <a
                        href={doc.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        Open
                      </a>
                    )}
                  </div>
                  {doc.requires_acknowledgement && (
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Requires Acknowledgement
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No documents found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {selectedCategory !== "all"
                  ? "No documents in this category. Try a different filter."
                  : "Create your first seller document to get started."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
