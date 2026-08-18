import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, Home, ArrowRightLeft, ListOrdered, User, Settings } from "lucide-react";
import chaseLogo from "@assets/images_1783889036399.png";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: ListOrdered },
  { href: "/transfer", label: "Transfer Funds", icon: ArrowRightLeft },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-6 h-24 flex items-center border-b border-sidebar-border/50">
          <Link href="/dashboard" className="cursor-pointer">
            <img src={chaseLogo} alt="Chase" className="h-10 object-contain" />
          </Link>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || location.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer text-sm font-medium",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border/50">
          <div className="mb-4 px-4 py-3 bg-sidebar-accent/50 rounded-md">
            <p className="text-xs text-sidebar-foreground/60">Logged in as</p>
            <p className="text-sm font-semibold truncate">{user?.fullName}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-destructive-foreground/80 hover:text-destructive-foreground hover:bg-destructive/20 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="absolute left-1/2 -translate-x-1/2 flex items-center"
            aria-label="Chase"
          >
            <img
              src={chaseLogo}
              alt="Chase"
              className="h-8 w-auto object-contain brightness-0 invert"
            />
          </Link>
          <button onClick={logout} className="text-sidebar-foreground p-2">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
