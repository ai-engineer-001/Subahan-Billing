"use client";

import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Icons } from "../../components/Icons";

type Bill = {
  id: string;
  totalAmount: number;
  createdAt: string;
};

type Item = {
  itemId: string;
  deletedAt?: string | null;
};

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalItems: 0,
    activeItems: 0,
    recentBills: 0,
    totalRevenue: 0,
  });
  const [recentBills, setRecentBills] = useState<Bill[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [items, bills] = await Promise.all([
          apiFetch<Item[]>("/items?includeDeleted=true"),
          apiFetch<Bill[]>("/bills?limit=5"),
        ]);

        const activeItems = items.filter((i) => !i.deletedAt).length;
        const totalRevenue = bills.reduce((sum, b) => sum + b.totalAmount, 0);

        setStats({
          totalItems: items.length,
          activeItems,
          recentBills: bills.length,
          totalRevenue,
        });

        setRecentBills(bills);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      }
    };

    loadData();
  }, []);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">
              <Icons.Package className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Active Items</div>
              <div className="stat-value">{stats.activeItems}</div>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">
              <Icons.FileText className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Items</div>
              <div className="stat-value">{stats.totalItems}</div>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon">
              <Icons.Receipt className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Recent Bills</div>
              <div className="stat-value">{stats.recentBills}</div>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">
              <Icons.DollarSign className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Revenue (KWD)</div>
              <div className="stat-value">{stats.totalRevenue.toFixed(3)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title-group">
              <Icons.Receipt className="card-icon" />
              <h2 className="card-title">Recent Bills</h2>
            </div>
            <a href="/bills" className="btn btn-outline">
              <span>View All</span>
              <Icons.TrendingUp className="btn-icon" />
            </a>
          </div>

          {recentBills.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Date</th>
                    <th>Amount (KWD)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map((bill) => (
                    <tr key={bill.id}>
                      <td>{bill.id.slice(0, 8)}...</td>
                      <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                      <td>{bill.totalAmount.toFixed(3)}</td>
                      <td>
                        <a href={`/print/${bill.id}`} className="btn btn-sm btn-primary">
                          <Icons.Printer className="btn-icon-sm" />
                          <span>Print</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="notice">No bills created yet.</p>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
