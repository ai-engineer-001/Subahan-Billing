"use client";

import { Fragment, useEffect, useState, useRef, useCallback } from "react";
import { apiFetch } from "../../lib/api";
import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Icons } from "../../components/Icons";
import Spinner from "../../components/Spinner";

type Item = {
  itemId: string;
  name: string;
  arabicName: string;
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

type BillItem = {
  itemId: string;
  itemName: string;
  arabicName: string;
  unit: string;
  quantity: number;
  buyingPrice?: number | null;
  unitPrice: number;
  baseSellingPrice: number;
};

type BillDetail = Bill & {
  items: BillItem[];
};

type LineItem = {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountPerUnit: number;
  searchTerm: string;
};

const BILLS_PER_PAGE = 20;

export default function BillsPage() {
  const draftKey = "billDraft";
  const [items, setItems] = useState<Item[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [billDetails, setBillDetails] = useState<Record<string, BillDetail>>({});
  const [customer, setCustomer] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { itemId: "", quantity: 1, unitPrice: 0, discountPerUnit: 0, searchTerm: "" }
  ]);
  const [status, setStatus] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"create" | "recent">("create");
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [billSearchQuery, setBillSearchQuery] = useState("");
  const [loadingBills, setLoadingBills] = useState(false);
  const [loadingMoreBills, setLoadingMoreBills] = useState(false);
  const [hasMoreBills, setHasMoreBills] = useState(true);
  const billsContainerRef = useRef<HTMLDivElement>(null);

  const loadItems = async () => {
    const data = await apiFetch<Item[]>("/items");
    setItems(data);
  };

  const loadBills = async (reset: boolean = false) => {
    if (reset) {
      setLoadingBills(true);
      setHasMoreBills(true);
    } else {
      setLoadingMoreBills(true);
    }
    
    try {
      const offset = reset ? 0 : bills.length;
      const data = await apiFetch<Bill[]>(`/bills?limit=${BILLS_PER_PAGE}&offset=${offset}`);
      
      if (reset) {
        setBills(data);
      } else {
        setBills(prev => [...prev, ...data]);
      }
      
      setHasMoreBills(data.length === BILLS_PER_PAGE);
      
      // Load details for new bills
      const details = await Promise.all(
        data.map(async (bill) => {
          try {
            const detail = await apiFetch<BillDetail>(`/bills/${bill.id}`);
            return [bill.id, detail] as const;
          } catch (err) {
            console.error("Failed to load bill details", bill.id, err);
            return null;
          }
        })
      );
      
      const nextDetails: Record<string, BillDetail> = reset ? {} : { ...billDetails };
      details.forEach((entry) => {
        if (entry) {
          nextDetails[entry[0]] = entry[1];
        }
      });
      setBillDetails(nextDetails);
    } catch (err) {
      console.error("Failed to load bills:", err);
    } finally {
      setLoadingBills(false);
      setLoadingMoreBills(false);
    }
  };

  const handleBillsScroll = useCallback(() => {
    if (!billsContainerRef.current || !hasMoreBills || loadingMoreBills) return;
    
    const container = billsContainerRef.current;
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollThreshold = container.scrollHeight * 0.8;
    
    if (scrollPosition >= scrollThreshold) {
      loadBills(false);
    }
  }, [hasMoreBills, loadingMoreBills, bills.length]);

  useEffect(() => {
    loadItems();
    loadBills(true);
  }, []);

  useEffect(() => {
    const container = billsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleBillsScroll);
      return () => container.removeEventListener('scroll', handleBillsScroll);
    }
  }, [handleBillsScroll]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedDraft = sessionStorage.getItem(draftKey);
    if (!storedDraft) {
      return;
    }

    try {
      const parsed = JSON.parse(storedDraft) as { customer?: string; lines?: LineItem[] };
      if (typeof parsed.customer === "string") {
        setCustomer(parsed.customer);
      }
      if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
        setLines(parsed.lines);
      }
    } catch (error) {
      console.warn("Failed to restore bill draft", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const draft = {
      customer,
      lines
    };
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
  }, [customer, lines]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleBeforeUnload = () => {
      sessionStorage.removeItem(draftKey);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".item-search")) {
        setActiveSearchIndex(null);
      }
    };

    if (activeSearchIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeSearchIndex]);

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
    setActiveSearchIndex(index);
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
  const getDiscountPerUnit = (item: BillItem) => Math.max(0, item.baseSellingPrice - item.unitPrice);
  const getLineProfit = (item: BillItem) => item.buyingPrice != null
    ? (item.unitPrice - item.buyingPrice) * item.quantity
    : null;

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
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(draftKey);
      }
      await loadBills(true);
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
        <div className="grid">
          <div className="card">
            <div className="card-header">
              <div className="card-title-group">
                <Icons.Receipt className="card-icon" />
                <h2 className="card-title">
                  {activePanel === "create" ? "Create New Bill" : "Recent Bills"}
                </h2>
              </div>
              <div className="segmented-toggle" role="tablist" aria-label="Bill panels">
                <button
                  type="button"
                  className={activePanel === "create" ? "segmented-option active" : "segmented-option"}
                  onClick={() => setActivePanel("create")}
                  role="tab"
                  aria-selected={activePanel === "create"}
                >
                  <Icons.Receipt className="btn-icon-sm" />
                  <span>Create New Bill</span>
                </button>
                <button
                  type="button"
                  className={activePanel === "recent" ? "segmented-option active" : "segmented-option"}
                  onClick={() => setActivePanel("recent")}
                  role="tab"
                  aria-selected={activePanel === "recent"}
                >
                  <Icons.FileText className="btn-icon-sm" />
                  <span>Show Recent Bills</span>
                </button>
              </div>
            </div>
            <div className="card-body">
              {activePanel === "create" && (
                <>
                  <div className="form-group">
                    <label className="form-label">Customer Name (optional)</label>
                    <input
                      type="text"
                      value={customer || ""}
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

                    <div className="table-container line-items-table-container">
                      <table className="table bill-items-table">
                        <thead>
                          <tr>
                            <th style={{ width: "120px" }}>Item No</th>
                            <th>Item Name</th>
                            <th className="cell-center">Unit</th>
                            <th className="cell-center">Qty</th>
                            <th className="cell-right">Unit Price (KWD)</th>
                            <th className="cell-right">Discount/Unit</th>
                            <th className="cell-right">Subtotal</th>
                            <th className="cell-right">Profit (KWD)</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line, index) => {
                            const selectedItem = items.find((item) => item.itemId === line.itemId);
                            const effectiveUnitPrice = getEffectiveUnitPrice(line);
                            const lineSubtotal = getLineSubtotal(line);
                            const lineProfit = selectedItem?.buyingPrice && effectiveUnitPrice > 0
                              ? (effectiveUnitPrice - selectedItem.buyingPrice) * line.quantity
                              : null;

                            const query = line.searchTerm.trim().toLowerCase();
                            const filteredItems = !line.itemId && query
                              ? items
                                  .filter((item) => {
                                    return (
                                      item.itemId.toLowerCase().includes(query) ||
                                      item.name.toLowerCase().includes(query)
                                    );
                                  })
                                  .slice(0, 10)
                              : [];

                            return (
                              <tr key={index} className={activeSearchIndex === index ? "active-search" : ""}>
                                <td>
                                  {selectedItem ? (
                                    <span className="item-id">{selectedItem.itemId}</span>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                                <td>
                                  <div className="item-search">
                                    <input
                                      type="text"
                                      value={selectedItem ? selectedItem.name : (line.searchTerm || "")}
                                      onChange={(e) => handleSearchChange(index, e.target.value)}
                                      onFocus={() => setActiveSearchIndex(index)}
                                      placeholder="Type to search item..."
                                    />
                                    {activeSearchIndex === index && filteredItems.length > 0 && (
                                      <div className="item-search-list">
                                        {filteredItems.map((item) => (
                                          <button
                                            key={item.itemId}
                                            type="button"
                                            className="item-search-option"
                                            onClick={() => handleSelectItem(index, item.itemId)}
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
                                    value={line.unitPrice === 0 ? "" : line.unitPrice}
                                    onChange={(e) => {
                                      const nextValue = e.target.value === "" ? 0 : Number(e.target.value);
                                      updateLine(index, { unitPrice: nextValue });
                                    }}
                                  />
                                </td>
                                <td className="cell-right">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={line.discountPerUnit === 0 ? "" : line.discountPerUnit}
                                    onChange={(e) => {
                                      const nextValue = e.target.value === "" ? 0 : Number(e.target.value);
                                      updateLine(index, { discountPerUnit: nextValue });
                                    }}
                                  />
                                </td>
                                <td className="cell-right">
                                  {lineSubtotal.toFixed(3)}
                                </td>
                                <td className="cell-right">
                                  {lineProfit === null ? "—" : lineProfit.toFixed(3)}
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
                    <button
                      className="btn btn-primary btn-block"
                      onClick={handleCreateBill}
                      disabled={!hasSelectedItems}
                    >
                      <Icons.Check className="btn-icon" />
                      <span>Create Bill</span>
                    </button>
                  </div>

                  {status && (
                    <div
                      className={status.includes("success") ? "alert success" : "alert error"}
                      style={{ marginTop: "16px" }}
                    >
                      {status}
                    </div>
                  )}
                </>
              )}

                {activePanel === "recent" && (
                  <>
                    <div className="form-group" style={{ marginBottom: "var(--space-4)" }}>
                      <label className="form-label">
                        <Icons.Search className="label-icon" />
                        <span>Search Bills</span>
                      </label>
                      <input
                        type="text"
                        value={billSearchQuery}
                        onChange={(e) => setBillSearchQuery(e.target.value)}
                        placeholder="Search by Bill ID, Customer, or Item Name..."
                      />
                    </div>
                    {loadingBills ? (
                      <div style={{ padding: "var(--space-6)", textAlign: "center" }}>
                        <Spinner />
                        <p style={{ marginTop: "var(--space-3)" }}>Loading bills...</p>
                      </div>
                    ) : (
                      <div className="table-container" ref={billsContainerRef} style={{ maxHeight: "calc(100vh - 450px)", overflowY: "auto" }}>
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
                        {bills.filter((bill) => {
                          if (!billSearchQuery.trim()) return true;
                          const query = billSearchQuery.toLowerCase();
                          const detail = billDetails[bill.id];
                          
                          // Search by bill ID
                          if (bill.id.toLowerCase().includes(query)) return true;
                          
                          // Search by customer name
                          if (bill.customer && bill.customer.toLowerCase().includes(query)) return true;
                          
                          // Search by item names in bill
                          if (detail) {
                            return detail.items.some(item => 
                              item.itemName.toLowerCase().includes(query) ||
                              item.itemId.toLowerCase().includes(query) ||
                              (item.arabicName && item.arabicName.includes(query))
                            );
                          }
                          
                          return false;
                        }).map((bill) => {
                          const detail = billDetails[bill.id];

                          return (
                            <Fragment key={bill.id}>
                              <tr>
                                <td>{bill.id.slice(0, 8)}...</td>
                                <td>{bill.customer || "Walk-in"}</td>
                                <td className="cell-center">{bill.totalAmount.toFixed(3)}</td>
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
                              <tr>
                                <td colSpan={5}>
                                  {detail ? (
                                    <div className="table-container line-items-table-container">
                                      <table className="table bill-items-table bill-items-table-readonly">
                                        <thead>
                                          <tr>
                                            <th style={{ width: "120px" }}>Item No</th>
                                            <th>Item Name</th>
                                            <th className="cell-center">Unit</th>
                                            <th className="cell-center">Qty</th>
                                            <th className="cell-center">Unit Price (KWD)</th>
                                            <th className="cell-center">Discount/Unit</th>
                                            <th className="cell-center">Subtotal</th>
                                            <th className="cell-center">Profit (KWD)</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {detail.items.map((item) => {
                                            const lineSubtotal = item.unitPrice * item.quantity;
                                            const lineProfit = getLineProfit(item);

                                            return (
                                              <tr key={`${bill.id}-${item.itemId}`}>
                                                <td><span className="item-id">{item.itemId}</span></td>
                                                <td>
                                                  <div>
                                                    <div>{item.itemName}</div>
                                                    {item.arabicName && (
                                                      <div className="text-muted" dir="rtl">{item.arabicName}</div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="cell-center">{item.unit}</td>
                                                <td className="cell-center">{item.quantity}</td>
                                                <td className="cell-center">{item.unitPrice.toFixed(3)}</td>
                                                <td className="cell-center">{getDiscountPerUnit(item).toFixed(3)}</td>
                                                <td className="cell-center">{lineSubtotal.toFixed(3)}</td>
                                                <td className="cell-center">{lineProfit === null ? "—" : lineProfit.toFixed(3)}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="notice">Loading bill items...</p>
                                  )}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                    {loadingMoreBills && (
                      <div style={{ padding: "var(--space-4)", textAlign: "center" }}>
                        <Spinner />
                        <p style={{ marginTop: "var(--space-2)", fontSize: "13px", color: "var(--text-tertiary)" }}>Loading more bills...</p>
                      </div>
                    )}
                    {!hasMoreBills && bills.length > 0 && (
                      <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                        All bills loaded
                      </div>
                    )}
                    {bills.filter((bill) => {
                      if (!billSearchQuery.trim()) return true;
                      const query = billSearchQuery.toLowerCase();
                      const detail = billDetails[bill.id];
                      if (bill.id.toLowerCase().includes(query)) return true;
                      if (bill.customer && bill.customer.toLowerCase().includes(query)) return true;
                      if (detail) {
                        return detail.items.some(item => 
                          item.itemName.toLowerCase().includes(query) ||
                          item.itemId.toLowerCase().includes(query) ||
                          (item.arabicName && item.arabicName.includes(query))
                        );
                      }
                      return false;
                    }).length === 0 && (
                      <p className="notice">No bills found matching "{billSearchQuery}"</p>
                    )}
                  </div>
                  )}
                </>
              )}
              </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
