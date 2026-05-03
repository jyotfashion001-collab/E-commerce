import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Users,
  UserCircle,
  Calculator,
  Building2,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/lib/use-auth";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = NavItem[];

export function Sidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const groups: NavGroup[] = [
    [
      { href: "/co-dashboard", label: "Co. Dashboard", icon: Building2 },
      { href: "/product-purchase", label: "Product Purchase", icon: Package },
      { href: "/inventory", label: "Inventory", icon: ShoppingBag },
    ],
    [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/payments", label: "Payment", icon: Wallet },
      { href: "/accounting", label: "Accounting", icon: Calculator },
      { href: "/upload", label: "Upload Payment", icon: Upload },
    ],
    [
      ...(user?.role === "admin"
        ? [
            { href: "/companies", label: "Companies", icon: Building2 },
            { href: "/users", label: "Team Members", icon: Users },
          ]
        : []),
      { href: "/account", label: "My Account", icon: UserCircle },
    ],
  ].filter((g) => g.length > 0);

  return (
    <div className="flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 font-bold text-xl tracking-tight text-white hover:text-white/90 transition-colors"
        >
          <img
            src={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/logo.svg`}
            alt="Order Hub"
            className="w-8 h-8"
          />
          <span>VB Enterprise </span>
        </Link>
      </div>
      <div className="flex-1 overflow-auto py-4">
        <nav className="px-3">
          {groups.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && (
                <div className="my-3 border-t border-sidebar-border/60" />
              )}
              <div className="space-y-1">
                {group.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
