"use client";

import { useEffect, useState } from "react";
import { clearAuth, getAuthExpiry, getAuthToken, login } from "../lib/api";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    const expiry = getAuthExpiry();
    setSignedIn(!!token);
    setExpiresAt(expiry);
  }, []);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await login(username, password);
      setStatus("Logged in. Your session is remembered for 30 days.");
      setSignedIn(true);
      setExpiresAt(getAuthExpiry());
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    setSignedIn(false);
    setExpiresAt(null);
    setStatus("Signed out.");
  };

  return (
    <div className="page">
      <section className="card hero">
        <div>
          <span className="pill">Subahan Shop</span>
          <h1>Billing, faster and friendlier.</h1>
          <p className="notice">
            Create bills with custom prices per line item, manage products, and print invoices in seconds.
          </p>
        </div>
        <div className="hero-actions">
          <a className="btn" href="/items">Manage Items</a>
          <a className="btn secondary" href="/bills">Create Bill</a>
        </div>
      </section>

      <div className="grid grid-2">
        <section className="card">
          <h2 className="section-title">Login</h2>
          <form onSubmit={handleLogin} className="stack">
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="actions">
              <button type="submit" disabled={loading} className="btn">
                {loading ? "Signing in..." : "Sign in"}
              </button>
              {signedIn && (
                <button type="button" className="btn ghost" onClick={handleLogout}>
                  Sign out
                </button>
              )}
            </div>
            {signedIn && expiresAt && (
              <p className="notice">Remembered until {new Date(expiresAt).toLocaleDateString()}.</p>
            )}
            {status && <p className="notice">{status}</p>}
          </form>
        </section>

        <section className="card">
          <h2 className="section-title">Quick Actions</h2>
          <p>Manage store items, create bills, and print invoices with custom prices.</p>
          <div className="grid">
            <a className="badge" href="/items">Go to Items</a>
            <a className="badge" href="/bills">Go to Bills</a>
            <span className="badge">Session remembered for 30 days</span>
          </div>
        </section>
      </div>
    </div>
  );
}
