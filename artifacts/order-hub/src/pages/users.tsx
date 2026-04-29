import { useListUsers, useUpdateUserRole, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShieldAlert, Shield } from "lucide-react";
import { useAuth } from "@/lib/use-auth";
import { format, parseISO } from "date-fns";

export default function Users() {
  const { data: users, isLoading, error } = useListUsers({
    query: { retry: false },
  });

  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateRoleMutation = useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "Role updated successfully" });
      },
      onError: () => {
        toast({ title: "Failed to update role", variant: "destructive" });
      },
    },
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        toast({ title: "User deleted successfully" });
      },
      onError: () => {
        toast({ title: "Failed to delete user", variant: "destructive" });
      },
    },
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center space-y-4">
        <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Admin Access Required</h2>
        <p className="text-muted-foreground">
          You need administrator privileges to view and manage team members. Please contact your organization owner.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Team Members</h1>
        <p className="text-muted-foreground mt-1">Manage user access and roles.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>A list of all users who have signed into your Order Hub.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">Loading users...</TableCell>
                  </TableRow>
                ) : users?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">No users found.</TableCell>
                  </TableRow>
                ) : (
                  users?.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const initials = u.fullName
                      ? u.fullName.split(" ").map((n) => n[0]).join("").substring(0, 2)
                      : u.email.substring(0, 2).toUpperCase();

                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={u.avatarUrl || undefined} />
                              <AvatarFallback>{initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {u.fullName || "Unknown"} {isSelf && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                              </span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            disabled={isSelf || updateRoleMutation.isPending}
                            value={u.role}
                            onValueChange={(val: "admin" | "staff") =>
                              updateRoleMutation.mutate({ id: u.id, data: { role: val } })
                            }
                          >
                            <SelectTrigger className="w-[110px] h-8 border-none bg-transparent hover:bg-muted p-1">
                              <Badge variant={u.role === "admin" ? "default" : "secondary"} className="mr-2">
                                {u.role === "admin" ? <Shield className="w-3 h-3 mr-1" /> : null}
                                {u.role.toUpperCase()}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(parseISO(u.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isSelf || deleteMutation.isPending}
                            onClick={() => {
                              if (confirm("Are you sure you want to remove this user? They will lose access to the app.")) {
                                deleteMutation.mutate({ id: u.id });
                              }
                            }}
                            className={isSelf ? "opacity-0" : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
