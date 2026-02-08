"use client";

import { ReactNode, useState, useEffect } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navItems = [
    { label: "Dashboard", path: "/dashboard", Icon: Icons.Dashboard },
    { label: "Items", path: "/items", Icon: Icons.Package },
    { label: "Bills", path: "/bills", Icon: Icons.Receipt },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  // Close sidebar on mobile when route changes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state based on screen size
    handleResize();

    // Listen for window resize
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close sidebar when clicking outside on mobile
  const handleBackdropClick = () => {
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={handleBackdropClick}></div>
      )}

      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className={`nav-item ${pathname === item.path ? "active" : ""}`}
              onClick={() => {
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false);
                }
              }}
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
          <div className="header-left">
            <button 
              className="menu-toggle" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              <div className="brand-icon">S</div>
            </button>
            <h1 className="page-title">
              {navItems.find((item) => item.path === pathname)?.label || "Dashboard"}
            </h1>
          </div>
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
