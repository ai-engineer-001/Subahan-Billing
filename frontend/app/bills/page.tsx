"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Icons } from "../../components/Icons";

type Item = {
  itemId: string;
  name: string;
  buyingPrice?: number | null;
  sellingPrice: number;
  unit: string;
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
  discountPerUnit: number;
  searchTerm: string;
};

export default function BillsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { itemId: "", quantity: 1, unitPrice: 0, discountPerUnit: 0, searchTerm: "" }
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [recentOpen, setRecentOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

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
    setLines([...lines, { itemId: "", quantity: 1, unitPrice: 0, discountPerUnit: 0, searchTerm: "" }]);
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
      unitPrice: item ? item.sellingPrice : 0,
      discountPerUnit: 0,
      searchTerm: ""
    });
    setActiveSearchIndex(null);
  };

  const handleSearchChange = (index: number, value: string) => {
    updateLine(index, { searchTerm: value, itemId: "" });
    if (value.trim()) {
      setActiveSearchIndex(index);
    }
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      setLines([{ itemId: "", quantity: 1, unitPrice: 0, discountPerUnit: 0, searchTerm: "" }]);
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const getEffectiveUnitPrice = (line: LineItem) => Math.max(0, line.unitPrice - line.discountPerUnit);
  const getLineSubtotal = (line: LineItem) => getEffectiveUnitPrice(line) * line.quantity;

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
            unitPrice: Number(getEffectiveUnitPrice(line))
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
      setLines([{ itemId: "", quantity: 1, unitPrice: 0, discountPerUnit: 0, searchTerm: "" }]);
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

  const totalAmount = lines.reduce((sum, line) => sum + getLineSubtotal(line), 0);
  const hasSelectedItems = lines.some((line) => line.itemId);

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

                  <div className="table-container">
                    <table className="table bill-items-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="cell-center">Unit</th>
                          <th className="cell-center">Qty</th>
                          <th className="cell-right">Unit Price (KWD)</th>
                          <th className="cell-right">Discount/Unit</th>
                          <th className="cell-right">Subtotal</th>
                          <th className="cell-right">Profit %</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, index) => {
                          const selectedItem = items.find((item) => item.itemId === line.itemId);
                          const effectiveUnitPrice = getEffectiveUnitPrice(line);
                          const lineSubtotal = getLineSubtotal(line);
                          const profitMargin = selectedItem?.buyingPrice && effectiveUnitPrice > 0
                            ? ((effectiveUnitPrice - selectedItem.buyingPrice) / effectiveUnitPrice) * 100
                            : null;
                          
                          const displayValue = line.itemId && selectedItem
                            ? `${selectedItem.itemId} - ${selectedItem.name}`
                            : line.searchTerm;
                          
                          const filteredItems = !line.itemId && line.searchTerm
                            ? items
                                .filter((item) => {
                                  const query = line.searchTerm.toLowerCase();
                                  return (
                                    item.itemId.toLowerCase().includes(query) ||
                                    item.name.toLowerCase().includes(query)
                                  );
                                })
                                .slice(0, 10)
                            : [];

                          return (
                            <tr key={index}>
                              <td>
                                <div className="item-search">
                                  <input
                                    value={displayValue}
                                    onChange={(e) => handleSearchChange(index, e.target.value)}
                                    onFocus={() => setActiveSearchIndex(index)}
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setActiveSearchIndex((current) => (current === index ? null : current));
                                      }, 200);
                                    }}
                                    placeholder="Type to search item..."
                                  />
                                  {activeSearchIndex === index && filteredItems.length > 0 && (
                                    <div className="item-search-list">
                                      {filteredItems.map((item) => (
                                        <button
                                          key={item.itemId}
                                          type="button"
                                          className="item-search-option"
                                          onMouseDown={() => handleSelectItem(index, item.itemId)}
                                        >
                                          <span className="item-search-id">{item.itemId}</span>
                                          <span className="item-search-name">{item.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="cell-center">
                                {selectedItem?.unit ?? "--"}
                              </td>
                              <td className="cell-center">
                                <input
                                  type="number"
                                  min="1"
                                  value={line.quantity}
                                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                                />
                              </td>
                              <td className="cell-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  value={line.unitPrice}
                                  onChange={(e) => updateLine(index, { unitPrice: Number(e.target.value) })}
                                />
                              </td>
                              <td className="cell-right">
                                <input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={line.discountPerUnit}
                                  onChange={(e) => updateLine(index, { discountPerUnit: Number(e.target.value) })}
                                />
                              </td>
                              <td className="cell-right">
                                {lineSubtotal.toFixed(3)}
                              </td>
                              <td className="cell-right">
                                {profitMargin === null ? "—" : `${profitMargin.toFixed(1)}%`}
                              </td>
                              <td className="cell-center">
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-danger btn-sm"
                                  onClick={() => removeLine(index)}
                                  disabled={lines.length <= 1}
                                >
                                  <Icons.Trash className="btn-icon-sm" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
                  <button className="btn btn-primary btn-block" onClick={handleCreateBill} disabled={!hasSelectedItems}>
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
