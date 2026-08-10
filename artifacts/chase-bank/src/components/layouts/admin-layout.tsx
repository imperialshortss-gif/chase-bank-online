import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { LogOut, LayoutDashboard, Users, ArrowRightLeft } from "lucide-react";
import chaseLogo from "@assets/images_1783889036399.png";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/transfers", label: "Transfers", icon: ArrowRightLeft },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a2540] text-white border-r border-[#1a3857] hidden md:flex flex-col">
        <div className="p-6 h-24 flex items-center border-b border-[#1a3857]">
          <Link href="/admin/dashboard" className="cursor-pointer">
            <img src={chaseLogo} alt="Chase" className="h-10 object-contain brightness-0 invert" />
            <span className="ml-2 text-xs font-semibold tracking-widest text-[#c9a227] uppercase mt-1">Administration</span>
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
                      ? "bg-[#117aca] text-white" 
                      : "text-white/70 hover:bg-[#1a3857] hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#1a3857]">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-6 md:p-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
