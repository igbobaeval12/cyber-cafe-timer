import { useState } from "react";
import { useLocation } from "wouter";
import { Bell, ChevronDown, LayoutDashboard, Monitor, Users, Clock3, Receipt, BarChart3, Package, Settings, LogOut, Menu, Search, Plus, Printer, ShoppingCart, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { hasPermission } from "@/lib/staffPermissions";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin", permission: "admin_dashboard" },
  { label: "PCs", icon: Monitor, href: "/admin/pcs", permission: "manage_pcs" },
  { label: "Customers", icon: Users, href: "/admin/customers", permission: "manage_customers" },
  { label: "Leads", icon: UserRoundSearch, href: "/admin/leads", permission: "admin_dashboard" },
  { label: "Sessions", icon: Clock3, href: "/admin/sessions", permission: "manage_sessions" },
  { label: "Billing", icon: Receipt, href: "/admin/billing", permission: "manage_billing" },
  { label: "Printing", icon: Printer, href: "/admin/printing", permission: "manage_printing" },
  { label: "Reports", icon: BarChart3, href: "/admin/reports", permission: "view_reports" },
  { label: "Staff", icon: Users, href: "/admin/staff", permission: "manage_customers" },
  { label: "Inventory", icon: Package, href: "/admin/inventory", permission: "manage_inventory" },
  { label: "POS", icon: ShoppingCart, href: "/admin/pos", permission: "manage_pos" },
  { label: "Settings", icon: Settings, href: "/admin/settings", permission: "admin_dashboard" },
];

type AdminShellProps = {
  children: React.ReactNode;
  title: string;
  description?: string;
};

export function AdminShell({ children, title, description }: AdminShellProps) {
  const [, navigate] = useLocation();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const currentDate = new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" });
  const currentTime = new Date().toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" });

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-950/95 text-slate-100">
      <div className="border-b border-slate-800 px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <Monitor className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">Cyber Café</p>
            <p className="text-xs text-slate-400">Admin Center</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.filter((item) => !user || user.role === "admin" || user.role === "super_admin" || hasPermission(user, item.permission)).map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin" ? window.location.pathname === "/admin" : window.location.pathname.startsWith(item.href);
          return (
            <button
              key={item.label}
              onClick={() => {
                setMobileOpen(false);
                navigate(item.href);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-cyan-500/15 text-cyan-300" : "text-slate-300 hover:bg-slate-800/80 hover:text-white"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800/80 hover:text-white">
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-950/95 lg:flex">
          <SidebarContent />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
            <div className="flex items-center justify-between px-4 py-4 lg:px-6">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild className="lg:hidden">
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 border-r border-slate-800 bg-slate-950 p-0">
                    <SidebarContent />
                  </SheetContent>
                </Sheet>
                <div>
                  <h1 className="text-xl font-semibold">{title}</h1>
                  {description ? <p className="text-sm text-slate-400">{description}</p> : null}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-800/80 px-3 py-2 text-sm text-slate-300 md:flex">
                  <Search className="h-4 w-4 text-slate-400" />
                  <span>Search</span>
                </div>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:bg-slate-800">
                  <Bell className="h-5 w-5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-2 text-slate-300 hover:bg-slate-800">
                      <Avatar className="h-8 w-8 border border-slate-700">
                        <AvatarFallback className="bg-cyan-500/15 text-cyan-300">{user?.name?.[0] ?? "A"}</AvatarFallback>
                      </Avatar>
                      <span className="hidden text-sm font-medium sm:block">{user?.name ?? "Admin"}</span>
                      <ChevronDown className="hidden h-4 w-4 sm:block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-slate-800 bg-slate-900 text-slate-100">
                    <DropdownMenuLabel>Signed in as {user?.username ?? "admin"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-400 lg:px-6">
              <div className="flex items-center gap-2">
                <span>{currentDate}</span>
                <span className="text-slate-600">•</span>
                <span>{currentTime}</span>
              </div>
              <div className="flex items-center gap-2 text-cyan-300">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>System online</span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
