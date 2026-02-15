"use client";

import { ProtectedRoute } from "../../components/AuthProvider";
import DashboardLayout from "../../components/DashboardLayout";
import { Fragment, useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import { Icons } from "../../components/Icons";

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
  purchasePercentage?: number | null;
  sellPercentage?: number | null;
  unitPrice: number;
};

type BillDetail = Bill & {
  items: BillItem[];
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
  const [billDetails, setBillDetails] = useState<Record<string, BillDetail>>({});

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

        const details = await Promise.all(
          bills.map(async (bill) => {
            try {
              const detail = await apiFetch<BillDetail>(`/bills/${bill.id}`);
              return [bill.id, detail] as const;
            } catch (err) {
              console.error("Failed to load bill details", bill.id, err);
              return null;
            }
          })
        );
        const nextDetails: Record<string, BillDetail> = {};
        details.forEach((entry) => {
          if (entry) {
            nextDetails[entry[0]] = entry[1];
          }
        });
        setBillDetails(nextDetails);
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
          <div className="stat-card green">
            <div className="stat-icon">
              <Icons.FileText className="icon" />
            </div>
            <div className="stat-content">
              <div className="stat-label">Total Items</div>
              <div className="stat-value">{stats.totalItems}</div>
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
                  {recentBills.map((bill) => {
                    const detail = billDetails[bill.id];
                    const getLineProfit = (item: BillItem) => item.buyingPrice != null
                      ? (item.unitPrice - item.buyingPrice) * item.quantity
                      : null;

                    return (
                      <Fragment key={bill.id}>
                        <tr>
                          <td>{bill.id.slice(0, 8)}...</td>
                          <td>{new Date(bill.createdAt).toLocaleDateString()}</td>
                          <td className="cell-center">{bill.totalAmount.toFixed(3)}</td>
                          <td>
                            <a href={`/print/${bill.id}`} className="btn btn-sm btn-primary">
                              <Icons.Printer className="btn-icon-sm" />
                              <span>Print</span>
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={4}>
                            {detail ? (
                              <div className="table-container line-items-table-container">
                                <table className="table bill-items-table bill-items-table-readonly">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "120px" }}>Item No</th>
                                      <th>Item Name</th>
                                      <th className="cell-center">Unit</th>
                                      <th className="cell-center">Qty</th>
                                      <th className="cell-center">Purchase Price</th>
                                      <th className="cell-center">Purchase %</th>
                                      <th className="cell-center">Selling %</th>
                                      <th className="cell-center">Unit Price (KWD)</th>
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
                                          <td className="cell-center">{item.buyingPrice != null ? item.buyingPrice.toFixed(3) : "-"}</td>
                                          <td className="cell-center">{item.purchasePercentage != null ? `${item.purchasePercentage.toFixed(2)}%` : "-"}</td>
                                          <td className="cell-center">{item.sellPercentage != null ? `${item.sellPercentage.toFixed(2)}%` : "-"}</td>
                                          <td className="cell-center">{item.unitPrice.toFixed(3)}</td>
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
            </div>
          ) : (
            <p className="notice">No bills created yet.</p>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
