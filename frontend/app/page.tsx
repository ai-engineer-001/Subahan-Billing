"use client";

import { useState } from "react";
import { login } from "../lib/api";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      await login(username, password);
      setStatus("Logged in successfully.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 className="section-title">Login</h2>
        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
          {status && <p className="notice">{status}</p>}
        </form>
      </section>
      <section className="card">
        <h2 className="section-title">Quick Actions</h2>
        <p>Manage store items, create bills, and print invoices with custom prices.</p>
        <div className="grid">
          <a className="badge" href="/items">Go to Items</a>
          <a className="badge" href="/bills">Go to Bills</a>
        </div>
      </section>
    </div>
  );
}
