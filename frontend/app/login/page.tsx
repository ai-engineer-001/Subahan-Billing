"use client";

import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(username, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">S</div>
          <h1 className="login-title">Subahan Billing</h1>
          <p className="login-subtitle">Sign in to continue to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="alert error">{error}</div>}

          <button type="submit" disabled={loading} style={{ width: "100%", marginTop: "8px" }}>
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="notice" style={{ textAlign: "center", marginTop: "16px" }}>
            Session will be remembered for 30 days
          </p>
        </form>
      </div>
    </div>
  );
}
