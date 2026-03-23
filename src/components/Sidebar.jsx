import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../store/auth.jsx";
import {
  Coffee, Building2, Users, LayoutDashboard,
  LogOut, Search, X,
  GitBranch, Package, BookOpen, ChevronRight, Clock, BarChart2
} from "lucide-react";

const NAV = [
  {
    group: "Overview",
    items: [
      { to: "/", icon: LayoutDashboard, label: "Dashboard", sub: "System overview",
        roles: ["super_admin","org_admin","branch_manager","teller"] },
    ],
  },
  {
    group: "Management",
    items: [
      { to: "/orgs",      icon: Building2, label: "Organizations", sub: "Manage coffee brands",  roles: ["super_admin"] },
      { to: "/users",     icon: Users,     label: "Users",         sub: "Staff accounts",        roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/branches",  icon: GitBranch, label: "Branches",      sub: "Manage branches",       roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/menu",      icon: Coffee,    label: "Menu",          sub: "Items & categories",    roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/inventory", icon: Package,   label: "Inventory",     sub: "Stock & transfers",     roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/recipes",   icon: BookOpen,  label: "Recipes",       sub: "Drink ingredients",     roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/shifts",    icon: Clock,     label: "Shifts",        sub: "Reports & management",  roles: ["super_admin","org_admin","branch_manager"] },
      { to: "/reports-dashboard", icon: BarChart2, label: "Analytics", sub: "Reports & trends",
        roles: ["super_admin","org_admin","branch_manager"] },
    ],
  },
];

function SidebarContent({ user, onClose, onSignOut }) {
  const [search, setSearch] = useState("");

  const filtered = NAV.map(g => ({
    ...g,
    items: g.items.filter(i =>
      i.roles.includes(user?.role) &&
      (search === "" || i.label.toLowerCase().includes(search.toLowerCase()))
    ),
  })).filter(g => g.items.length > 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Logo row — always visible, hamburger X on mobile */}
      <div style={{
        padding: "0 16px",
        height: 56,
        borderBottom: "1px solid #F3F4F6",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <img
          src="/TheRue.png"
          alt="The Rue"
          style={{ height: 28, objectFit: "contain", maxWidth: 120 }}
        />
        {/* Close button — only shown on mobile via onClose being meaningful */}
        <button
          onClick={onClose}
          className="lg:hidden"
          style={{
            border: "none", background: "none", cursor: "pointer",
            color: "#9CA3AF", padding: 6, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "10px 12px", borderBottom: "1px solid #F3F4F6", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          background: "#F9FAFB", border: "1px solid #E5E7EB",
          borderRadius: 10, padding: "7px 11px",
        }}>
          <Search size={13} color="#9CA3AF" style={{ flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, color: "#374151", width: "100%", minWidth: 0,
            }}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              style={{ border:"none", background:"none", cursor:"pointer", color:"#9CA3AF", fontSize:16, lineHeight:1, padding:0, flexShrink:0 }}
            >×</button>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px", WebkitOverflowScrolling: "touch" }}>
        {filtered.map(group => (
          <div key={group.group} style={{ marginBottom: 16 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: "#9CA3AF",
              letterSpacing: "0.08em", textTransform: "uppercase",
              padding: "0 8px", marginBottom: 5,
            }}>{group.group}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {group.items.map(({ to, icon: Icon, label, sub }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={onClose}
                  style={({ isActive }) => ({
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 10,
                    textDecoration: "none", transition: "all 0.15s",
                    background: isActive ? "#EFF6FF" : "transparent",
                    border: `1px solid ${isActive ? "#BFDBFE" : "transparent"}`,
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <div style={{
                        width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: isActive ? "linear-gradient(135deg,#1a56db,#3b28cc)" : "#F3F4F6",
                        boxShadow: isActive ? "0 2px 8px rgba(26,86,219,0.3)" : "none",
                        transition: "all 0.15s",
                      }}>
                        <Icon size={14} color={isActive ? "#fff" : "#6B7280"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: 13, fontWeight: isActive ? 700 : 500,
                          color: isActive ? "#1a56db" : "#111827",
                          margin: 0, lineHeight: 1.3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{label}</p>
                        <p style={{
                          fontSize: 11, color: "#9CA3AF", margin: 0, lineHeight: 1.3,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{sub}</p>
                      </div>
                      {isActive && <ChevronRight size={12} color="#1a56db" style={{ flexShrink: 0 }} />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ padding: "10px 12px", borderTop: "1px solid #F3F4F6", flexShrink: 0 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          padding: "9px 11px", borderRadius: 12,
          background: "#F9FAFB", border: "1px solid #E5E7EB", marginBottom: 7,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "linear-gradient(135deg,#1a56db,#3b28cc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 13, fontWeight: 700, color: "#111827", margin: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{user?.name}</p>
            <p style={{ fontSize: 11, color: "#6B7280", margin: 0, textTransform: "capitalize" }}>
              {user?.role?.replace(/_/g, " ")}
            </p>
          </div>
          <span style={{
            fontSize: 10, fontWeight: 700, color: "#1a56db",
            background: "#EFF6FF", border: "1px solid #BFDBFE",
            padding: "2px 7px", borderRadius: 20, flexShrink: 0,
            textTransform: "capitalize", letterSpacing: 0.2,
          }}>
            {user?.role === "super_admin" ? "Admin" : user?.role?.split("_")[0]}
          </span>
        </div>
        <button
          onClick={onSignOut}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 7, padding: "9px 0", border: "none", borderRadius: 10,
            background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 600,
            cursor: "pointer", transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "#DC2626"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "#FEF2F2"; e.currentTarget.style.color = "#DC2626"; }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const handleSignOut     = () => { signOut(); navigate("/login"); };

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.3)", backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className="lg:hidden"
        style={{
          position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 50,
          width: "min(280px, 82vw)",
          background: "#fff", borderRight: "1px solid #F3F4F6",
          boxShadow: "4px 0 24px rgba(0,0,0,0.1)",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <SidebarContent user={user} onClose={onMobileClose} onSignOut={handleSignOut} />
      </aside>

      {/* Desktop sidebar — always visible */}
      <aside
        className="hidden lg:flex"
        style={{
          flexDirection: "column", width: 256, height: "100vh",
          background: "#fff", borderRight: "1px solid #F3F4F6",
          boxShadow: "2px 0 12px rgba(0,0,0,0.04)",
          flexShrink: 0, position: "sticky", top: 0,
        }}
      >
        <SidebarContent user={user} onClose={() => {}} onSignOut={handleSignOut} />
      </aside>
    </>
  );
}
