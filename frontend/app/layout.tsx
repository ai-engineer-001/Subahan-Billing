import "./globals.css";

export const metadata = {
  title: "Subahan Billing",
  description: "Billing software for Subahan shop"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="app-header">
            <div className="brand">
              <div className="brand-mark">S</div>
              <div>
                <div className="brand-title">Subahan Billing</div>
                <div className="brand-subtitle">Kuwait Dinar ready</div>
              </div>
            </div>
            <nav className="nav-links">
              <a href="/">Home</a>
              <a href="/items">Items</a>
              <a href="/bills">Bills</a>
            </nav>
          </header>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
