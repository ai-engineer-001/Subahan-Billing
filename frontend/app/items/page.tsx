"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
  isWireBox: boolean;
  purchasePercentage?: number | null;
  sellPercentage?: number | null;
  deletedAt?: string | null;
};

const emptyForm = {
  itemId: "",
  name: "",
  arabicName: "",
  buyingPrice: "",
  sellingPrice: "",
  unit: "pcs",
  isWireBox: false,
  purchasePercentage: "",
  sellPercentage: ""
};

type TabType = "active" | "trash";

const ITEMS_PER_PAGE = 20;

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [idCheckMessage, setIdCheckMessage] = useState<string | null>(null);
  const [idCheckKind, setIdCheckKind] = useState<"success" | "error" | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [transliterating, setTransliterating] = useState(false);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const transliterationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const itemsRef = useRef<Item[]>([]);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const modalBodyRef = useRef<HTMLDivElement | null>(null);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    itemsRef.current = items;
    hasMoreRef.current = hasMore;
    loadingMoreRef.current = loadingMore;
  }, [items, hasMore, loadingMore]);

  const activeItems = items.filter((item) => !item.deletedAt);
  const deletedItems = items.filter((item) => item.deletedAt);

  const loadItems = async (reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      const offset = reset ? 0 : items.length;
      const data = await apiFetch<Item[]>(`/items?includeDeleted=true&limit=${ITEMS_PER_PAGE}&offset=${offset}`);
      
      if (reset) {
        setItems(data);
      } else {
        setItems(prev => [...prev, ...data]);
      }
      
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load items");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current || !hasMoreRef.current || loadingMoreRef.current) return;

    const container = scrollContainerRef.current;
    const scrollPosition = container.scrollTop + container.clientHeight;
    const scrollThreshold = container.scrollHeight * 0.8;

    if (scrollPosition >= scrollThreshold) {
      loadItems(false);
    }
  }, []); // No dependencies - uses refs instead!

  useEffect(() => {
    loadItems(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    scrollContainerRef.current = document.querySelector(".dashboard-content");
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener("scroll", handleScroll);
      return () => container.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Lock body scroll when modal is open (prevents header scroll detection)
  useEffect(() => {
    if (modalOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [modalOpen]);

  const isValidItemId = (value: string) => /^[A-Za-z0-9]+$/.test(value);

  // Safari-specific: Preserve cursor position during onChange
  const handleInputChange = (field: string, value: string) => {
    const input = inputRefs.current[field];
    const cursorPosition = input?.selectionStart ?? value.length;
    
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Restore cursor position after state update (Safari fix)
    // Only works for text inputs, not number inputs
    if (input && input.type === 'text') {
      setTimeout(() => {
        input.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);
    }
  };

  const transliterateToArabic = async (text: string): Promise<string> => {
    if (!text.trim()) return "";
    
    try {
      const response = await fetch(
        `https://inputtools.google.com/request?text=${encodeURIComponent(text)}&itc=ar-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8&app=demopage`,
        {
          method: "GET",
          headers: {
            "Accept": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        console.error("Transliteration API error:", response.status);
        return "";
      }
      
      const data = await response.json();
      
      // Response format: ["SUCCESS", [["input", ["suggestion1", "suggestion2", ...], {...}]]]
      if (data?.[0] === "SUCCESS" && data?.[1]?.[0]?.[1]?.[0]) {
        return data[1][0][1][0]; // First suggestion
      }
      
      return "";
    } catch (error) {
      console.error("Failed to transliterate:", error);
      return "";
    }
  };

  const handleNameBlur = async () => {
    // Auto-transliterate on blur only (faster, less API calls)
    if (form.name.trim()) {
      setTransliterating(true);
      try {
        const arabicText = await transliterateToArabic(form.name);
        if (arabicText) {
          setForm(prev => ({ ...prev, arabicName: arabicText }));
        }
      } finally {
        setTransliterating(false);
      }
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);

    const trimmedId = form.itemId.trim();
    const trimmedName = form.name.trim();
    
    if (!editingId) {
      // For new items, require verification first
      if (!trimmedId) {
        setStatus("Item ID is required");
        return;
      }
      if (trimmedId.length > 100) {
        setStatus("Item ID must be at most 100 characters");
        return;
      }
      if (!isValidItemId(trimmedId)) {
        setStatus("Item ID must contain only letters and numbers");
        return;
      }
      
      // Check if verification was done
      if (idCheckKind !== "success") {
        setStatus("Please verify the Item ID first by clicking the 'Verify' button");
        setIdCheckMessage("Click 'Verify' to check if the Item ID is available");
        setIdCheckKind("error");
        // Scroll to top of modal to show the error
        if (modalBodyRef.current) {
          modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        return;
      }
    }
    
    if (!trimmedName) {
      setStatus("Item name is required");
      return;
    }
    if (!form.arabicName.trim()) {
      setStatus("Arabic name is required");
      return;
    }

    // Validate based on mode
    if (form.isWireBox) {
      const purchasePrice = Number(form.buyingPrice);
      const purchasePct = Number(form.purchasePercentage);
      const sellPct = Number(form.sellPercentage);
      
      if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
        setStatus("Purchase Price is required and must be positive for Wire/Box items");
        return;
      }
      if (!Number.isFinite(purchasePct) || purchasePct < 0 || purchasePct > 100) {
        setStatus("Purchase % must be between 0 and 100");
        return;
      }
      if (!Number.isFinite(sellPct) || sellPct < 0 || sellPct > 100) {
        setStatus("Sell % must be between 0 and 100");
        return;
      }
    } else {
      const purchasePrice = Number(form.buyingPrice);
      const sellingPrice = Number(form.sellingPrice);
      
      if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
        setStatus("Purchase Price is required and must be positive");
        return;
      }
      if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
        setStatus("Selling Price is required and must be positive");
        return;
      }
    }

    setLoading(true);
    
    try {
      const payload: any = {
        name: trimmedName,
        arabicName: form.arabicName.trim(),
        unit: form.unit || "pcs",
        isWireBox: form.isWireBox,
        buyingPrice: Number(form.buyingPrice)
      };

      if (form.isWireBox) {
        payload.purchasePercentage = Number(form.purchasePercentage);
        payload.sellPercentage = Number(form.sellPercentage);
        // Backend will calculate sellingPrice, but we need to send 0 to satisfy the struct
        payload.sellingPrice = 0;
      } else {
        payload.sellingPrice = Number(form.sellingPrice);
      }

      if (editingId) {
        payload.itemId = form.itemId.trim();
        await apiFetch(`/items/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        setStatus("Item updated successfully!");
      } else {
        payload.itemId = trimmedId;
        await apiFetch("/items", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        setStatus("Item created successfully!");
      }

      setForm({ ...emptyForm });
      setEditingId(null);
      setModalOpen(false);
      setIdCheckMessage(null);
      setIdCheckKind(null);
      await loadItems(true);
      
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Item) => {
    setEditingId(item.itemId);
    setForm({
      itemId: item.itemId,
      name: item.name,
      arabicName: item.arabicName || "",
      buyingPrice: item.buyingPrice?.toString() ?? "",
      sellingPrice: item.sellingPrice.toString(),
      unit: item.unit || "pcs",
      isWireBox: item.isWireBox,
      purchasePercentage: item.purchasePercentage?.toString() ?? "",
      sellPercentage: item.sellPercentage?.toString() ?? ""
    });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item? It can be restored within 24 hours.")) {
      return;
    }
    
    setLoading(true);
    try {
      await apiFetch(`/items/${itemId}`, { method: "DELETE" });
      await loadItems(true);
      setStatus("Item moved to trash");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (itemId: string) => {
    setLoading(true);
    try {
      await apiFetch(`/items/${itemId}/restore`, { method: "POST" });
      await loadItems(true);
      setStatus("Item restored successfully!");
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setIdCheckMessage(null);
    setIdCheckKind(null);
    setModalOpen(false);
  };

  const handleVerifyId = async () => {
    const trimmedId = form.itemId.trim();
    if (!trimmedId) {
      setIdCheckMessage("Enter an Item ID to verify");
      setIdCheckKind("error");
      return;
    }
    if (trimmedId.length > 100) {
      setIdCheckMessage("Item ID must be at most 100 characters");
      setIdCheckKind("error");
      return;
    }
    if (!isValidItemId(trimmedId)) {
      setIdCheckMessage("Item ID must contain only letters and numbers");
      setIdCheckKind("error");
      return;
    }

    setVerifying(true);
    setIdCheckMessage(null);
    setIdCheckKind(null);

    try {
      const allItems = await apiFetch<Item[]>("/items?includeDeleted=true&limit=1000&offset=0");
      const existing = allItems.find((item) => item.itemId.toLowerCase() === trimmedId.toLowerCase());

      if (!existing) {
        setIdCheckMessage("Item ID is available");
        setIdCheckKind("success");
      } else if (editingId && existing.itemId === editingId) {
        setIdCheckMessage("Item ID is valid");
        setIdCheckKind("success");
      } else {
        setIdCheckMessage(`Item exists with same id and ${existing.name}.`);
        setIdCheckKind("error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setIdCheckMessage(message || "Unable to verify Item ID");
      setIdCheckKind("error");
    } finally {
      setVerifying(false);
    }
  };

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
              <div className="stat-value">{activeItems.length}</div>
            </div>
          </div>
          <div className="stat-card orange">
            <div className="stat-icon">
              <Icons.Trash className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">In Trash</div>
              <div className="stat-value">{deletedItems.length}</div>
            </div>
          </div>
        </div>

        {status && (
          <div className={`alert ${status.includes("success") || status.includes("restored") || status.includes("moved") ? "success" : "alert-error"}`} style={{ marginBottom: "var(--space-6)" }}>
            <Icons.Check className="alert-icon" />
            <span>{status}</span>
          </div>
        )}

        <div className="card">
          <div className="card-header items-card-header">
            <div className="card-title-group">
              <Icons.Package className="card-icon" />
              <h2 className="card-title">Items</h2>
            </div>
            <button className="btn btn-sm btn-primary" onClick={handleAddNew}>
              <Icons.Plus className="btn-icon-sm" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="items-toggle-row">
            <div className="segmented-toggle" role="tablist" aria-label="Item lists">
              <button
                type="button"
                className={activeTab === "active" ? "segmented-option active" : "segmented-option"}
                onClick={() => setActiveTab("active")}
                role="tab"
                aria-selected={activeTab === "active"}
              >
                <Icons.Package className="btn-icon-sm" />
                <span>Active Items</span>
                <span className="tab-badge">{activeItems.length}</span>
              </button>
              <button
                type="button"
                className={activeTab === "trash" ? "segmented-option active" : "segmented-option"}
                onClick={() => setActiveTab("trash")}
                role="tab"
                aria-selected={activeTab === "trash"}
              >
                <Icons.Trash className="btn-icon-sm" />
                <span>Trash Bin</span>
                {deletedItems.length > 0 && (
                  <span className="tab-badge danger">{deletedItems.length}</span>
                )}
              </button>
            </div>
          </div>

            {activeTab === "active" && (
              <>
                {loading ? (
                  <div className="empty-state">
                    <Spinner />
                    <p>Loading items...</p>
                  </div>
                ) : activeItems.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Package className="empty-icon" />
                    <h3>No items yet</h3>
                    <p>Create your first item using the Add Item button</p>
                  </div>
                ) : (
                  <div className="table-container items-table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Item ID</th>
                          <th>Name</th>
                          <th>Unit</th>
                          <th>Purchase</th>
                          <th>Selling</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeItems.map((item) => (
                          <tr key={item.itemId}>
                            <td>
                              <span className="item-id">{item.itemId}</span>
                            </td>
                            <td>
                              <strong>{item.name}</strong>
                            </td>
                            <td>
                              <span className="badge">{item.unit}</span>
                            </td>
                            <td>
                              {item.isWireBox ? (
                                <span className="badge" style={{ backgroundColor: "var(--info)", color: "white" }}>
                                  {item.purchasePercentage?.toFixed(2)}%
                                </span>
                              ) : item.buyingPrice ? (
                                <span className="price">{item.buyingPrice.toFixed(3)} KWD</span>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td>
                              {item.isWireBox ? (
                                <span className="badge" style={{ backgroundColor: "var(--success)", color: "white" }}>
                                  {item.sellPercentage?.toFixed(2)}%
                                </span>
                              ) : (
                                <span className="price primary">{item.sellingPrice.toFixed(3)} KWD</span>
                              )}
                            </td>
                            <td>
                              <div className="btn-group">
                                <button 
                                  className="btn btn-sm btn-ghost" 
                                  onClick={() => handleEdit(item)}
                                  disabled={loading}
                                >
                                  <Icons.Edit className="btn-icon-sm" />
                                  <span>Edit</span>
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={() => handleDelete(item.itemId)}
                                  disabled={loading}
                                >
                                  <Icons.Trash className="btn-icon-sm" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {loadingMore && (
                      <div style={{ padding: "var(--space-4)", textAlign: "center" }}>
                        <Spinner />
                        <p style={{ marginTop: "var(--space-2)", fontSize: "13px", color: "var(--text-tertiary)" }}>Loading more items...</p>
                      </div>
                    )}
                    {!hasMore && activeItems.length > 0 && (
                      <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                        All items loaded
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {activeTab === "trash" && (
              <>
                {loading ? (
                  <div className="empty-state">
                    <Spinner />
                    <p>Loading trash...</p>
                  </div>
                ) : deletedItems.length === 0 ? (
                  <div className="empty-state">
                    <Icons.Trash className="empty-icon" />
                    <h3>Trash is empty</h3>
                    <p>Deleted items will appear here for 24 hours before permanent removal</p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "var(--space-4) var(--space-6)", background: "var(--warning-bg)", borderBottom: "1px solid var(--border-color)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <Icons.AlertCircle style={{ width: "20px", height: "20px", color: "var(--warning)" }} />
                        <p style={{ fontSize: "13px", color: "var(--warning)", margin: 0 }}>
                          Items in trash will be permanently deleted after 24 hours
                        </p>
                      </div>
                    </div>
                    <div className="table-container items-table-container">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Item ID</th>
                            <th>Name</th>
                            <th>Unit</th>
                            <th>Selling Price</th>
                            <th>Deleted At</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedItems.map((item) => (
                            <tr key={item.itemId} style={{ opacity: 0.7 }}>
                              <td>
                                <span className="item-id">{item.itemId}</span>
                              </td>
                              <td>
                                <strong>{item.name}</strong>
                              </td>
                              <td>
                                <span className="badge">{item.unit}</span>
                              </td>
                              <td>
                                <span className="price">{item.sellingPrice.toFixed(3)} KWD</span>
                              </td>
                              <td>
                                {item.deletedAt && new Date(item.deletedAt).toLocaleString()}
                              </td>
                              <td>
                                <button 
                                  className="btn btn-sm btn-success" 
                                  onClick={() => handleRestore(item.itemId)}
                                  disabled={loading}
                                >
                                  <Icons.RotateCcw className="btn-icon-sm" />
                                  <span>Restore</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {loadingMore && (
                        <div style={{ padding: "var(--space-4)", textAlign: "center" }}>
                          <Spinner />
                          <p style={{ marginTop: "var(--space-2)", fontSize: "13px", color: "var(--text-tertiary)" }}>Loading more items...</p>
                        </div>
                      )}
                      {!hasMore && deletedItems.length > 0 && (
                        <div style={{ padding: "var(--space-4)", textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px" }}>
                          All items loaded
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

        {modalOpen && (
          <div className="modal-backdrop" onClick={handleCloseModal}>
            <div className="modal-card" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header">
                <div className="card-title-group">
                  <Icons.Package className="card-icon" />
                  <h2 className="card-title">{editingId ? "Edit Item" : "Add New Item"}</h2>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={handleCloseModal}>
                  <Icons.X className="btn-icon-sm" />
                </button>
              </div>

              <div className="modal-body" ref={modalBodyRef}>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label">
                      <Icons.FileText className="label-icon" />
                      <span>Item ID</span>
                    </label>
                    <div className="input-with-action">
                      <input
                        type="text"
                        value={form.itemId || ""}
                        maxLength={100}
                        ref={(el) => { inputRefs.current['itemId'] = el; }}
                        onChange={(e) => {
                          handleInputChange('itemId', e.target.value);
                          setIdCheckMessage(null);
                          setIdCheckKind(null);
                        }}
                        placeholder="e.g., ABC123"
                        required
                      />
                      <button type="button" className="btn btn-sm btn-secondary" onClick={handleVerifyId} disabled={verifying}>
                        {verifying ? (
                          <>
                            <span className="spinner-small" style={{ marginRight: "6px" }}>⏳</span>
                            <span>Checking...</span>
                          </>
                        ) : (
                          <span>{editingId ? "Check" : "Verify"}</span>
                        )}
                      </button>
                    </div>
                    {idCheckMessage && (
                      <p className={`inline-notice ${idCheckKind === "success" ? "success" : "error"}`}>
                        {idCheckMessage}
                      </p>
                    )}
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      {editingId ? "Update the Item ID if needed" : "Up to 100 letters and numbers (no spaces)"}
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">
                        <Icons.Package className="label-icon" />
                        <span>Item Name</span>
                      </label>
                      <input
                        type="text"
                        value={form.name || ""}
                        ref={(el) => { inputRefs.current['name'] = el; }}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        onBlur={handleNameBlur}
                        placeholder="e.g., Coca Cola 330ml"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">
                        <Icons.Package className="label-icon" />
                        <span>Item Name (Arabic)</span>
                        {transliterating && <span style={{ marginLeft: "8px", fontSize: "12px", color: "var(--text-tertiary)" }}>🔄 Transliterating...</span>}
                      </label>
                      <input
                        type="text"
                        value={form.arabicName || ""}
                        ref={(el) => { inputRefs.current['arabicName'] = el; }}
                        onChange={(e) => handleInputChange('arabicName', e.target.value)}
                        placeholder="مثال: كوكاكولا 330 مل"
                        dir="rtl"
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <Icons.Package className="label-icon" />
                      <span>Unit Type</span>
                    </label>
                    <select
                      value={form.unit || "pcs"}
                      onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    >
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="roll">Roll</option>
                      <option value="m">Meter (m)</option>
                    </select>
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      Select the unit of measurement for this item
                    </p>
                  </div>

                  <div className="form-group">
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={form.isWireBox}
                        onChange={(e) => setForm({ ...form, isWireBox: e.target.checked })}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <span style={{ fontWeight: 500 }}>Wire/Box Item</span>
                    </label>
                    <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                      Check this if the item uses percentage-based pricing instead of fixed prices
                    </p>
                  </div>

                  {form.isWireBox ? (
                    <>
                      <div className="form-group">
                        <label className="form-label">
                          <Icons.DollarSign className="label-icon" />
                          <span>Purchase Price (Required)</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={form.buyingPrice || ""}
                          ref={(el) => { inputRefs.current['buyingPrice'] = el; }}
                          onChange={(e) => handleInputChange('buyingPrice', e.target.value)}
                          placeholder="0.000 KWD"
                          required
                        />
                        <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                          Base purchase price (cost per unit) on which percentages apply
                        </p>
                      </div>

                      <div className="form-grid">
                        <div className="form-group">
                          <label className="form-label">
                            <Icons.TrendingUp className="label-icon" />
                            <span>Purchase % (Required)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={form.purchasePercentage || ""}
                            ref={(el) => { inputRefs.current['purchasePercentage'] = el; }}
                            onChange={(e) => handleInputChange('purchasePercentage', e.target.value)}
                            placeholder="0.00"
                            required
                          />
                          <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                            Discount percentage from base price (e.g., 9% means buy at 9% off)
                          </p>
                        </div>

                        <div className="form-group">
                          <label className="form-label">
                            <Icons.TrendingUp className="label-icon" />
                            <span>Sell % (Required)</span>
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={form.sellPercentage || ""}
                            ref={(el) => { inputRefs.current['sellPercentage'] = el; }}
                            onChange={(e) => handleInputChange('sellPercentage', e.target.value)}
                            placeholder="0.00"
                            required
                          />
                          <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                            Discount percentage from base price (e.g., 8% means sell at 8% off)
                          </p>
                        </div>
                      </div>

                      {/* Calculated Selling Price Preview */}
                      {form.buyingPrice && form.sellPercentage && (
                        <div style={{ 
                          padding: "var(--space-3)", 
                          backgroundColor: "var(--success-bg)", 
                          borderRadius: "var(--radius-md)",
                          marginTop: "var(--space-3)",
                          border: "1px solid var(--success)"
                        }}>
                          <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
                            <strong>Calculation:</strong>
                            <br />
                            • Actual Purchase Cost = {form.buyingPrice} × (1 - {form.purchasePercentage || 0}%) = {(Number(form.buyingPrice) * (1 - Number(form.purchasePercentage || 0) / 100)).toFixed(3)} KWD
                            <br />
                            • Selling Price = {form.buyingPrice} × (1 - {form.sellPercentage}%) = {(Number(form.buyingPrice) * (1 - Number(form.sellPercentage) / 100)).toFixed(3)} KWD
                            <br />
                            • Profit = {((Number(form.buyingPrice) * (1 - Number(form.sellPercentage) / 100)) - (Number(form.buyingPrice) * (1 - Number(form.purchasePercentage || 0) / 100))).toFixed(3)} KWD
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "var(--space-2)", borderTop: "1px solid var(--border-color)" }}>
                            <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>
                              Final Selling Price:
                            </span>
                            <span style={{ fontSize: "18px", fontWeight: "600", color: "var(--success)" }}>
                              {(Number(form.buyingPrice) * (1 - Number(form.sellPercentage) / 100)).toFixed(3)} KWD
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="form-group">
                        <label className="form-label">
                          <Icons.DollarSign className="label-icon" />
                          <span>Purchase Price (Required)</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={form.buyingPrice || ""}
                          ref={(el) => { inputRefs.current['buyingPrice'] = el; }}
                          onChange={(e) => handleInputChange('buyingPrice', e.target.value)}
                          placeholder="0.000 KWD"
                          required
                        />
                        <p className="notice" style={{ marginTop: "var(--space-2)", textAlign: "left" }}>
                          Enter the purchase price in KWD
                        </p>
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <Icons.TrendingUp className="label-icon" />
                          <span>Selling Price (Required)</span>
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          value={form.sellingPrice || ""}
                          ref={(el) => { inputRefs.current['sellingPrice'] = el; }}
                          onChange={(e) => handleInputChange('sellingPrice', e.target.value)}
                          placeholder="0.000 KWD"
                          required
                        />
                      </div>
                    </>
                  )}

                  <div className="btn-group" style={{ marginTop: "var(--space-6)" }}>
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                      {editingId ? <Icons.Check className="btn-icon" /> : <Icons.Plus className="btn-icon" />}
                      <span>{editingId ? "Update" : "Create"} Item</span>
                    </button>
                    <button type="button" className="btn btn-ghost" onClick={handleCloseModal}>
                      <Icons.X className="btn-icon" />
                      <span>Cancel</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
