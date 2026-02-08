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
    return <p className="notice">{status}</p>;
  }

  if (!bill) {
    return <p className="notice">Loading...</p>;
  }

  return (
    <div className="print-card">
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button onClick={() => window.print()}>Print</button>
      </div>
      <h2>Bill #{bill.id.slice(0, 8)}</h2>
      <p className="notice">Customer: {bill.customer || "Walk-in"}</p>
      <p className="notice">Date: {new Date(bill.createdAt).toLocaleString()}</p>
      <table className="table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>Item</th>
            <th>Qty</th>
            <th>Unit (KWD)</th>
            <th>Total (KWD)</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((item) => (
            <tr key={`${item.itemId}-${item.itemName}`}>
              <td>{item.itemName}</td>
              <td>{item.quantity}</td>
              <td>{item.unitPrice.toFixed(3)}</td>
              <td>{(item.unitPrice * item.quantity).toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ marginTop: 24 }}>Total: {bill.totalAmount.toFixed(3)} KWD</h3>
    </div>
  );
}
