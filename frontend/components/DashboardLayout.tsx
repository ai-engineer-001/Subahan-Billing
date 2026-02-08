"use client";

import { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { usePathname, useRouter } from "next/navigation";
import { Icons } from "./Icons";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Dashboard", path: "/dashboard", Icon: Icons.Dashboard },
    { label: "Items", path: "/items", Icon: Icons.Package },
    { label: "Bills", path: "/bills", Icon: Icons.Receipt },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-logo">
            <div className="brand-icon">S</div>
            <div className="brand-text">
              <div className="brand-name">Subahan</div>
              <div className="brand-subtitle">Billing</div>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`nav-item ${pathname === item.path ? "active" : ""}`}
            >
              <item.Icon className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </a>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "light" ? <Icons.Moon className="icon" /> : <Icons.Sun className="icon" />}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            <Icons.LogOut className="icon" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <h1 className="page-title">
            {navItems.find((item) => item.path === pathname)?.label || "Dashboard"}
          </h1>
          <div className="header-actions">
            <div className="user-badge">
              <Icons.User className="user-icon" />
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className="dashboard-content">{children}</div>
      </main>
    </div>
  );
}
