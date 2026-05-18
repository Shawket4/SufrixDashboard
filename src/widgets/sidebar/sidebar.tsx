import { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BarChart2,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Package,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  Tag,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { normalize } from "@/shared/lib/normalize";
import { Button } from "@/shared/ui/button";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import { Input } from "@/shared/ui/input";
import { useAuthStore } from "@/shared/auth/store";
import { useAppStore } from "@/shared/auth/app-store";
import { useCurrentContext } from "@/shared/hooks/use-current-context";
import { initials } from "@/shared/lib/format";
import { ThemeToggle } from "@/widgets/theme-toggle/theme-toggle";
import { LanguageToggle } from "@/widgets/language-toggle/language-toggle";
import type { Role } from "@/shared/config/constants";
import type { LucideIcon } from "lucide-react";
import { useOrg } from "@/entities/org/queries";
import { usePermissions } from "@/shared/hooks/use-permissions";

// ─────────────────────────────────────────────────────────────────────────────
// Navigation structure
// ─────────────────────────────────────────────────────────────────────────────
interface NavItem {
  to: string;
  icon: LucideIcon;
  key: string;
  roles: Role[];
  resource?: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    heading: "nav.overview",
    items: [
      { to: "/", icon: LayoutDashboard, key: "nav.dashboard", roles: ["super_admin", "org_admin", "branch_manager", "teller"] },
    ],
  },
  {
    heading: "nav.operations",
    items: [
      { to: "/orders", icon: ShoppingBag, key: "nav.orders", roles: ["super_admin", "org_admin", "branch_manager"], resource: "orders" },
      { to: "/shifts", icon: Clock, key: "nav.shifts", roles: ["super_admin", "org_admin", "branch_manager"], resource: "shifts" },
      { to: "/inventory", icon: Package, key: "nav.inventory", roles: ["super_admin", "org_admin", "branch_manager"], resource: "inventory" },
      { to: "/analytics", icon: BarChart2, key: "nav.analytics", roles: ["super_admin", "org_admin", "branch_manager"], resource: "orders" },
    ],
  },
  {
    heading: "nav.catalog",
    items: [
      { to: "/menu", icon: Coffee, key: "nav.menu", roles: ["super_admin", "org_admin", "branch_manager"], resource: "menu_items" },
      { to: "/recipes", icon: BookOpen, key: "nav.recipes", roles: ["super_admin", "org_admin", "branch_manager"], resource: "recipes" },
      { to: "/discounts", icon: Tag, key: "nav.discounts", roles: ["super_admin", "org_admin", "branch_manager"], resource: "discounts" },
    ],
  },
  {
    heading: "nav.admin",
    items: [
      { to: "/orgs", icon: Building2, key: "nav.orgs", roles: ["super_admin"], resource: "orgs" },
      { to: "/branches", icon: GitBranch, key: "nav.branches", roles: ["super_admin", "org_admin", "branch_manager"], resource: "branches" },
      { to: "/users", icon: Users, key: "nav.users", roles: ["super_admin", "org_admin", "branch_manager"], resource: "users" },
      { to: "/permissions", icon: Shield, key: "nav.permissions", roles: ["super_admin", "org_admin"], resource: "permissions" },
      { to: "/settings", icon: Settings, key: "nav.settings", roles: ["super_admin", "org_admin", "branch_manager"], resource: "branches" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Brand logo — tries /TheRue.png when expanded, gracefully falls back to the
// gradient tile + wordmark if the PNG is missing. Collapsed state is always
// the compact gradient tile to preserve the 72px rail.
// ─────────────────────────────────────────────────────────────────────────────
function BrandLogo({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const { orgId, orgLogo } = useCurrentContext();
  const { data: org } = useOrg(orgId);   // null-safe: enabled only when orgId != null
  const setSelectedOrg = useAppStore((s) => s.setSelectedOrg);

  // Sync background query result with persistent store
  useEffect(() => {
    if (org?.id === orgId && org.logo_url !== orgLogo) {
      setSelectedOrg(orgId, org.logo_url);
    }
  }, [org?.id, org?.logo_url, orgId, orgLogo, setSelectedOrg]);

  const [orgLogoFailed, setOrgLogoFailed] = useState(false);
  const [appLogoFailed, setAppLogoFailed] = useState(false);

  const tile = (
    <div className="w-8 h-8 brand-gradient rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
      <Coffee size={15} className="text-white" />
    </div>
  );

  const hasOrgLogo = Boolean(orgLogo || org?.logo_url) && !orgLogoFailed;
  const currentLogoUrl = orgLogo || org?.logo_url;

  if (collapsed) {
    return hasOrgLogo ? (
      <img
        src={currentLogoUrl!}
        alt={org?.name ?? ""}
        onError={() => setOrgLogoFailed(true)}
        className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
        draggable={false}
      />
    ) : tile;
  }

  if (hasOrgLogo) {
    return (
      <img
        src={currentLogoUrl!}
        alt={org?.name ?? ""}
        onError={() => setOrgLogoFailed(true)}
        className="h-10 px-2 object-contain select-none"
        draggable={false}
      />
    );
  }

  if (appLogoFailed) {
    return (
      <div className="flex items-center gap-2.5 min-w-0">
        {tile}
        <span className="font-bold tracking-tight truncate">{t("app.name")}</span>
      </div>
    );
  }

  return (
    <img
      src="/TheRue.png"
      alt={t("app.name")}
      onError={() => setAppLogoFailed(true)}
      className="h-8 px-2 object-contain select-none"
      draggable={false}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav row — left accent bar + primary-colored icon on active, smooth hover
// ─────────────────────────────────────────────────────────────────────────────
function NavRow({
  to, icon: Icon, label, collapsed, onClick,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const row = (
    <NavLink to={to} end={to === "/"} onClick={onClick}>
      {({ isActive }) => (
        <div
          className={cn(
            "group/navrow relative flex items-center rounded-md transition-colors duration-150",
            collapsed ? "h-9 w-9 mx-auto justify-center" : "h-9 px-3 gap-3",
            isActive
              ? "bg-accent text-foreground font-semibold"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
          )}
        >
          {/* Left accent bar (only when active & expanded — collapsed rail is too narrow) */}
          {isActive && !collapsed && (
            <span
              aria-hidden
              className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-e-full bg-primary"
            />
          )}
          <Icon
            size={collapsed ? 17 : 15}
            strokeWidth={isActive ? 2.2 : 1.75}
            className={cn(
              "flex-shrink-0 transition-colors",
              isActive ? "text-primary" : "text-current",
            )}
          />
          {!collapsed && <span className="text-sm truncate">{label}</span>}
        </div>
      )}
    </NavLink>
  );

  if (!collapsed) return row;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{row}</TooltipTrigger>
      <TooltipContent side="right" className="font-medium">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar content (shared between desktop + mobile drawer)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarContent({
  collapsed,
  onClose,
}: {
  collapsed: boolean;
  onClose?: () => void;
}) {
  const { t } = useTranslation();
  const { user, role } = useCurrentContext();
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const handleSignOut = () => {
    signOut();
    navigate("/login");
  };

  const { can } = usePermissions();

  const groups = useMemo(() => {
    const q = normalize(search);
    return NAV.map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (!role || !i.roles.includes(role)) return false;
        if (i.resource && !can(i.resource, "read")) return false;
        if (!q) return true;
        return normalize(t(i.key)).includes(q);
      }),
    })).filter((g) => g.items.length > 0);
  }, [role, search, t, can]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Brand header ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center border-b flex-shrink-0 h-14",
          collapsed ? "justify-center px-2" : "px-4 justify-between",
        )}
      >
        <BrandLogo collapsed={collapsed} />
        {onClose && !collapsed && (
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            className="lg:hidden"
            aria-label="Close menu"
          >
            <X />
          </Button>
        )}
      </div>

      {/* ── Search ───────────────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-2 flex-shrink-0">
          <div className="relative">
            <Search
              size={13}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("common.search")}
              className="ps-9 pe-14 h-9 bg-muted/50 border-0 focus-visible:bg-background focus-visible:ring-1"
            />
            {/* ⌘K hint — visual only for now */}
            <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <nav
        aria-label="Main navigation"
        className={cn("flex-1 overflow-y-auto py-2 no-scrollbar", collapsed ? "px-2" : "px-3")}
      >
        {groups.map((group, gi) => (
          <div key={group.heading} className={cn("first:mt-0", gi > 0 && "mt-4")}>
            {!collapsed ? (
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.08em] px-2 mb-1.5">
                {t(group.heading)}
              </p>
            ) : (
              gi > 0 && <div className="h-px bg-border/50 mx-1 my-3" aria-hidden />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={t(item.key)}
                  collapsed={collapsed}
                  onClick={onClose}
                />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && !collapsed && (
          <p className="text-xs text-muted-foreground text-center py-4">{t("common.noResults")}</p>
        )}
      </nav>

      {/* ── Footer: preferences + user card ──────────────────────────────── */}
      <div className={cn("flex-shrink-0 border-t", collapsed ? "p-2 space-y-1" : "p-3 space-y-2")}>
        <div
          className={cn(
            "flex gap-1",
            collapsed ? "flex-col items-center" : "items-center justify-between",
          )}
        >
          {!collapsed && (
            <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
              {t("nav.preferences")}
            </span>
          )}
          <div className={cn("flex gap-0.5", collapsed && "flex-col")}>
            <ThemeToggle side={collapsed ? "right" : "top"} />
            <LanguageToggle side={collapsed ? "right" : "top"} />
          </div>
        </div>

        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleSignOut}
                aria-label={`${user?.name ?? ""} — ${t("nav.signOut")}`}
                className="w-full flex items-center justify-center rounded-md hover:bg-accent/60 transition-colors p-1"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {initials(user?.name ?? "")}
                  </AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p className="font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{role ? t(`roles.${role}`) : ""}</p>
              <p className="text-xs text-muted-foreground mt-1">— {t("nav.signOut")}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <div className="rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {initials(user?.name ?? "")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {role ? t(`roles.${role}`) : ""}
                </p>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    onClick={handleSignOut}
                    aria-label={t("nav.signOut")}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <LogOut />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{t("nav.signOut")}</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggle = useAppStore((s) => s.toggleSidebar);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
          aria-hidden
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed start-0 top-0 bottom-0 z-50 w-[280px] max-w-[82vw] bg-background border-e shadow-xl lg:hidden safe-top safe-bottom",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <SidebarContent collapsed={false} onClose={onMobileClose} />
      </aside>

      {/* Desktop */}
      <aside
        className={cn(
          "hidden lg:flex relative flex-col bg-background border-e flex-shrink-0 sticky top-0 h-screen safe-top safe-bottom",
          "transition-[width] duration-200 ease-out",
          collapsed ? "w-[72px]" : "w-[244px]",
        )}
      >
        <SidebarContent collapsed={collapsed} />

        {/* Collapse handle — pill on the outer edge, vertically centered */}
        <button
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute -end-3 top-1/2 -translate-y-1/2 z-10",
            "w-6 h-10 rounded-full bg-background border shadow-sm",
            "flex items-center justify-center text-muted-foreground",
            "hover:text-foreground hover:bg-accent transition-colors duration-150",
          )}
        >
          {collapsed ? (
            <ChevronRight size={14} className="rtl:rotate-180" />
          ) : (
            <ChevronLeft size={14} className="rtl:rotate-180" />
          )}
        </button>
      </aside>
    </>
  );
}