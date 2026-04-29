import { useState } from "react";
import {
  useListCompanies,
  useCreateCompany,
  useDeleteCompany,
  getListCompaniesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/use-auth";
import { useBrand } from "@/lib/use-brand";
import { Building2, Plus, Trash2, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export default function Companies() {
  const { user } = useAuth();
  const { brand: activeBrand } = useBrand();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin";

  const { data: companies, isLoading } = useListCompanies();

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ slug: string; name: string } | null>(null);

  const createMutation = useCreateCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Company created", description: name });
        setCreateOpen(false);
        setName("");
        setSlug("");
        setSlugTouched(false);
        void queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Could not create company",
          description: err instanceof Error ? err.message : "Unknown error",
        });
      },
    },
  });

  const deleteMutation = useDeleteCompany({
    mutation: {
      onSuccess: () => {
        toast({ title: "Company deleted", description: pendingDelete?.name });
        setPendingDelete(null);
        void queryClient.invalidateQueries({ queryKey: getListCompaniesQueryKey() });
      },
      onError: (err) => {
        const apiErr = err as { data?: { error?: string } };
        const raw = apiErr.data?.error || (err instanceof Error ? err.message : "Unknown error");
        const description = raw.replace(/^HTTP \d+ \w+:\s*/i, "");
        toast({
          variant: "destructive",
          title: "Could not delete company",
          description,
        });
      },
    },
  });

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName || !trimmedSlug) return;
    createMutation.mutate({ data: { name: trimmedName, slug: trimmedSlug } });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Companies</h1>
          <p className="text-muted-foreground mt-1">
            Each company is an independent workspace with its own inventory, orders, and dashboard.
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)} data-testid="button-add-company">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : companies && companies.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Card key={c.slug} data-testid={`card-company-${c.slug}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{c.name}</CardTitle>
                      <CardDescription className="text-xs font-mono truncate">
                        {c.slug}
                      </CardDescription>
                    </div>
                  </div>
                  {c.slug === activeBrand && (
                    <Badge variant="secondary" className="shrink-0">
                      Active
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Created {format(parseISO(c.createdAt), "MMM d, yyyy")}</span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete({ slug: c.slug, name: c.name })}
                    data-testid={`button-delete-company-${c.slug}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No companies yet.</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add your first company
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add a new company</DialogTitle>
              <DialogDescription>
                Each company gets its own isolated workspace.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="company-name">Display name</Label>
                <Input
                  id="company-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Sunrise Apparel"
                  required
                  maxLength={80}
                  autoFocus
                  data-testid="input-company-name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="company-slug">Slug</Label>
                <Input
                  id="company-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugTouched(true);
                  }}
                  placeholder="sunrise"
                  required
                  pattern="^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$"
                  data-testid="input-company-slug"
                />
                <p className="text-xs text-muted-foreground">
                  Used as a stable identifier. 1-32 lowercase letters, digits, or dashes.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !name.trim() || !slug.trim()}
                data-testid="button-submit-company"
              >
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this company?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.name}" will be permanently removed. This is only allowed if the
              company has no orders or inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteMutation.mutate({ slug: pendingDelete.slug });
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-company"
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
