import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/use-auth";
import { useBrand } from "@/lib/use-brand";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, LogOut, Settings, UserCircle } from "lucide-react";

export function Topbar() {
  const { user, logout } = useAuth();
  const { brand, setBrand, companies, loadingCompanies } = useBrand();
  const navigate = useNavigate();

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

  function handleLogout() {
    logout();
    navigate("/sign-in", { replace: true });
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <Select value={brand} onValueChange={setBrand} disabled={loadingCompanies}>
          <SelectTrigger
            className="h-10 w-[220px] font-medium"
            data-testid="select-brand"
            aria-label="Select active company workspace"
          >
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent>
            {companies.map((c) => (
              <SelectItem key={c.slug} value={c.slug} data-testid={`select-brand-option-${c.slug}`}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {user?.role === "admin" && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-10 gap-2 text-muted-foreground hover:text-foreground"
            data-testid="button-manage-companies"
          >
            <Link to="/companies">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Manage</span>
            </Link>
          </Button>
        )}
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-full flex items-center justify-start gap-3 rounded-full hover:bg-accent px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl ?? undefined} alt={display} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm">
                <span className="font-medium text-foreground leading-none">{display}</span>
                <span className="text-xs text-muted-foreground leading-tight mt-1">{user?.role || "..."}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{display}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {user?.role && (
                  <div className="mt-2">
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role.toUpperCase()}
                    </Badge>
                  </div>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/account" className="cursor-pointer w-full flex items-center">
                <UserCircle className="mr-2 h-4 w-4" />
                <span>Account Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
