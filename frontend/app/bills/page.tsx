"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Icons } from "../../components/Icons";

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
  const [recentOpen, setRecentOpen] = useState(false);

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

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
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

      if (payload.items.length === 0) {
        setStatus("Please add at least one item to the bill");
        return;
      }

      await apiFetch("/bills", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setCustomer("");
      setLines([]);
      await loadBills();
      setStatus("Bill created successfully");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to create bill");
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm("Are you sure you want to remove this bill?")) {
      return
    }
    setStatus(null);
    try {
      await apiFetch(`/bills/${billId}`, { method: "DELETE" });
      await loadBills();
      setStatus("Bill removed successfully");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to delete bill");
    }
  };

  const totalAmount = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Icons.Receipt className="card-icon" />
                <h2 className="card-title">Create New Bill</h2>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setRecentOpen((open) => !open)}
              >
                <Icons.FileText className="btn-icon-sm" />
                <span>{recentOpen ? "Hide" : "Show"} Recent Bills</span>
              </button>
            </div>
              <div className="card-body">
                <div className="form-group">
                  <label className="form-label">Customer Name (optional)</label>
                  <input
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                    placeholder="Enter customer name or leave empty for walk-in"
                  />
                </div>

                <div className="card-section">
                  <div className="section-header">
                    <h3 className="section-title">Line Items</h3>
                    <button type="button" className="btn btn-secondary" onClick={addLine}>
                      <Icons.Plus className="btn-icon" />
                      <span>Add Item</span>
                    </button>
                  </div>

                  {lines.map((line, index) => (
                    <div key={index} className="card line-item-card">
                      <div className="form-group">
                        <label className="form-label">Item</label>
                        <select value={line.itemId} onChange={(e) => handleSelectItem(index, e.target.value)}>
                          <option value="">Select item</option>
                          {items.map((item) => (
                            <option key={item.itemId} value={item.itemId}>
                              {item.name} ({item.itemId})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="line-item-grid">
                        <div className="form-group">
                          <label className="form-label">Quantity</label>
                          <input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Unit Price (KWD)</label>
                          <input
                            type="number"
                            step="0.001"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                          />
                        </div>
                      </div>
                      <button type="button" className="btn btn-ghost btn-danger btn-block" onClick={() => removeLine(index)}>
                        <Icons.Trash className="btn-icon" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ))}

                  {lines.length === 0 && (
                    <p className="notice">No items added yet. Click "Add Item" to start.</p>
                  )}
                </div>

                {lines.length > 0 && (
                  <div className="bill-total">
                    <div className="bill-total-row">
                      <strong>Total Amount:</strong>
                      <strong className="bill-total-amount">{totalAmount.toFixed(3)} KWD</strong>
                    </div>
                  </div>
                )}

                <div className="card-section">
                  <button className="btn btn-primary btn-block" onClick={handleCreateBill} disabled={lines.length === 0}>
                    <Icons.Check className="btn-icon" />
                    <span>Create Bill</span>
                  </button>
                </div>

                {status && (
                  <div className={status.includes("success") ? "alert success" : "alert error"} style={{ marginTop: "16px" }}>
                    {status}
                  </div>
                )}
              </div>
          </div>
            {recentOpen && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title-group">
                    <Icons.FileText className="card-icon" />
                    <h2 className="card-title">Recent Bills</h2>
                  </div>
                </div>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bill ID</th>
                        <th>Customer</th>
                        <th>Total (KWD)</th>
                        <th>Date</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id}>
                          <td>{bill.id.slice(0, 8)}...</td>
                          <td>{bill.customer || "Walk-in"}</td>
                          <td>{bill.totalAmount.toFixed(3)}</td>
                          <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                          <td>
                            <div className="btn-group">
                              <a href={`/print/${bill.id}`} className="btn btn-sm btn-primary">
                                <Icons.Printer className="btn-icon-sm" />
                                <span>Print</span>
                              </a>
                              <button
                                type="button"
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteBill(bill.id)}
                              >
                                <Icons.Trash className="btn-icon-sm" />
                                <span>Remove</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
