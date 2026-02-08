"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

type Item = {
  itemId: string;
  name: string;
  sellingPrice: number;
};

type Bill = {
  id: string;
  customer?: string | null;
  totalAmount: number;
  createdAt: string;
};

type LineItem = {
  itemId: string;
  quantity: number;
  unitPrice: number;
};

export default function BillsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadItems = async () => {
    const data = await apiFetch<Item[]>("/items");
    setItems(data);
  };

  const loadBills = async () => {
    const data = await apiFetch<Bill[]>("/bills");
    setBills(data);
  };

  useEffect(() => {
    loadItems();
    loadBills();
  }, []);

  const addLine = () => {
    setLines([...lines, { itemId: "", quantity: 1, unitPrice: 0 }]);
  };

  const updateLine = (index: number, update: Partial<LineItem>) => {
    const next = [...lines];
    next[index] = { ...next[index], ...update };
    setLines(next);
  };

  const handleSelectItem = (index: number, itemId: string) => {
    const item = items.find((entry) => entry.itemId === itemId);
    updateLine(index, {
      itemId,
      unitPrice: item ? item.sellingPrice : 0
    });
  };

  const handleCreateBill = async () => {
    setStatus(null);
    try {
      const payload = {
        customer: customer.trim() || null,
        items: lines
          .filter((line) => line.itemId)
          .map((line) => ({
            itemId: line.itemId,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice)
          }))
      };

      await apiFetch("/bills", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCustomer("");
      setLines([]);
      await loadBills();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to create bill");
    }
  };

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 className="section-title">Create Bill</h2>
        <div className="field">
          <label>Customer (optional)</label>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
        </div>
        <div className="grid">
          {lines.map((line, index) => (
            <div key={index} className="card" style={{ boxShadow: "none" }}>
              <div className="field">
                <label>Item</label>
                <select value={line.itemId} onChange={(e) => handleSelectItem(index, e.target.value)}>
                  <option value="">Select item</option>
                  {items.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                      {item.name} ({item.itemId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="field">
                <label>Unit Price (KWD)</label>
                <input
                  type="number"
                  step="0.001"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                />
              </div>
              <button className="ghost" onClick={() => setLines(lines.filter((_, i) => i !== index))}>
                Remove line
              </button>
            </div>
          ))}
        </div>
        <button className="secondary" onClick={addLine}>Add line item</button>
        <button onClick={handleCreateBill} disabled={lines.length === 0}>
          Create bill
        </button>
        {status && <p className="notice">{status}</p>}
      </section>

      <section className="card">
        <h2 className="section-title">Recent Bills</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Customer</th>
              <th>Total (KWD)</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td>{bill.id.slice(0, 8)}...</td>
                <td>{bill.customer || "Walk-in"}</td>
                <td>{bill.totalAmount.toFixed(3)}</td>
                <td>
                  <a className="badge" href={`/print/${bill.id}`}>Print</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
