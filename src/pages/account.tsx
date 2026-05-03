import { useAuth } from "@/lib/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";

export default function Account() {
  const { user } = useAuth();
  const display = user?.fullName || user?.email || "User";
  const initials = (() => {
    if (!user) return "U";
    if (user.fullName) {
      const parts = user.fullName.trim().split(/\s+/);
      const first = parts[0]?.[0] ?? "";
      const last = parts.length > 1 ? parts[parts.length - 1]![0] : "";
      return (first + last).toUpperCase() || "U";
    }
    return user.email.slice(0, 2).toUpperCase();
  })();

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">My Account</h1>
        <p className="text-muted-foreground mt-1">View your profile and manage settings.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal information and role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b">
            <Avatar className="h-24 w-24 border">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={display} />
              <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="text-2xl font-bold">{display}</h2>
              <p className="text-muted-foreground">{user?.email}</p>
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                <Badge variant={user?.role === "admin" ? "default" : "secondary"} className="px-3 py-1">
                  {user?.role === "admin" ? <Shield className="w-3 h-3 mr-2" /> : null}
                  {user?.role?.toUpperCase() || "LOADING..."}
                </Badge>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="text-sm font-medium text-muted-foreground">User ID</div>
              <div className="sm:col-span-2 text-sm font-mono bg-muted px-2 py-1 rounded w-fit">{user?.id ?? "..."}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="text-sm font-medium text-muted-foreground">Email</div>
              <div className="sm:col-span-2 text-sm font-mono bg-muted px-2 py-1 rounded w-fit">{user?.email}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
