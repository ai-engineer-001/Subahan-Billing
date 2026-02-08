"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

type BillItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  baseSellingPrice: number;
};

type Bill = {
  id: string;
  customer?: string | null;
  totalAmount: number;
  createdAt: string;
  items: BillItem[];
};

export default function PrintPage({ params }: { params: { id: string } }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<Bill>(`/bills/${params.id}`);
        setBill(data);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to load bill");
      }
    };
    load();
  }, [params.id]);

  if (status) {
    return (
      <div className="loading-screen">
        <p className="notice">{status}</p>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading bill...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <div className="card">
        <div className="no-print" style={{ marginBottom: 24, display: "flex", gap: "12px" }}>
          <button onClick={() => window.print()} style={{ flex: 1 }}>🖨 Print Bill</button>
          <a href="/bills" className="btn ghost" style={{ flex: 1 }}>← Back to Bills</a>
        </div>
        
        <div style={{ textAlign: "center", marginBottom: 32, paddingBottom: 24, borderBottom: "2px solid var(--border)" }}>
          <h1 style={{ fontSize: "28px", marginBottom: "8px" }}>Subahan Billing</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>Invoice / Bill</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Bill ID</p>
            <p style={{ fontWeight: "600" }}>{bill.id}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Customer</p>
            <p style={{ fontWeight: "600" }}>{bill.customer || "Walk-in"}</p>
          </div>
          <div>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>Date</p>
            <p style={{ fontWeight: "600" }}>{new Date(bill.createdAt).toLocaleString()}</p>
          </div>
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Price (KWD)</th>
                <th>Total (KWD)</th>
              </tr>
            </thead>
            <tbody>
              {bill.items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.itemName}</td>
                  <td>{item.quantity}</td>
                  <td>{item.unitPrice.toFixed(3)}</td>
                  <td>{(item.unitPrice * item.quantity).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: "2px solid var(--border)", textAlign: "right" }}>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Grand Total</p>
          <p style={{ fontSize: "32px", fontWeight: "700", color: "var(--primary)" }}>{bill.totalAmount.toFixed(3)} KWD</p>
        </div>

        <div style={{ marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--border-light)", textAlign: "center" }}>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
