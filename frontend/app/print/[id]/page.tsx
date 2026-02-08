"use client";

import { use, useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

type BillItem = {
  itemId: string;
  itemName: string;
  unit: string;
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

export default function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [bill, setBill] = useState<Bill | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiFetch<Bill>(`/bills/${id}`);
        setBill(data);
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to load bill");
      }
    };
    load();
  }, [id]);

  useEffect(() => {
    if (bill) {
      document.title = `Invoice ${bill.id.slice(0, 8)}`;
    }
  }, [bill]);

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

  const invoiceDate = new Date(bill.createdAt);
  const invoiceNumber = bill.id.slice(0, 13).toUpperCase();

  return (
    <>
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .invoice-container {
            max-width: 100%;
            margin: 0;
            padding: 20mm;
            box-shadow: none;
          }
        }

        .invoice-container {
          max-width: 210mm;
          margin: 20px auto;
          padding: 15mm;
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .invoice-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 3px solid #2563eb;
        }

        .company-info h1 {
          margin: 0 0 8px 0;
          font-size: 28px;
          color: #1e40af;
          font-weight: 700;
        }

        .company-info p {
          margin: 4px 0;
          font-size: 13px;
          color: #64748b;
        }

        .invoice-details {
          text-align: right;
        }

        .invoice-label {
          font-size: 24px;
          font-weight: 700;
          color: #334155;
          margin: 0 0 16px 0;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 14px;
        }

        .detail-label {
          font-weight: 600;
          color: #475569;
          min-width: 100px;
        }

        .detail-value {
          color: #1e293b;
        }

        .bill-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 30px;
          padding: 20px;
          background: #f8fafc;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }

        .info-block {
          display: flex;
          flex-direction: column;
        }

        .info-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          margin-bottom: 6px;
          font-weight: 600;
        }

        .info-value {
          font-size: 15px;
          color: #1e293b;
          font-weight: 500;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 30px 0;
          font-size: 13px;
        }

        .invoice-table thead {
          background: #f5f0de;
        }

        .invoice-table th {
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          color: #333;
          border: 1px solid #8b7355;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          background: #f5f0de;
        }

        .invoice-table th.text-center {
          text-align: center;
        }

        .invoice-table th.text-right {
          text-align: right;
        }

        .invoice-table td {
          padding: 12px 10px;
          border: 1px solid #8b7355;
          color: #1e293b;
        }

        .invoice-table tbody tr:nth-child(even) {
          background: #fafbfc;
        }

        .invoice-table tbody tr:hover {
          background: #f8fafc;
        }

        .item-no {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #475569;
        }

        .item-name {
          font-weight: 500;
        }

        .unit-badge {
          display: inline-block;
          padding: 4px 8px;
          background: #dbeafe;
          color: #1e40af;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .text-center {
          text-align: center;
        }

        .text-right {
          text-align: right;
        }

        .price-split {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .fils {
          color: #64748b;
          font-size: 11px;
          min-width: 40px;
        }

        .kd {
          font-weight: 600;
          min-width: 70px;
          text-align: right;
        }

        .total-section {
          margin-top: 30px;
          display: flex;
          justify-content: flex-end;
        }

        .total-box {
          min-width: 350px;
          background: #f5f0de;
          border: 2px solid #8b7355;
          border-radius: 0;
          padding: 20px 30px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
        }

        .total-label {
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .total-value {
          font-size: 20px;
          font-weight: 700;
          color: #1e293b;
        }

        .invoice-footer {
          margin-top: 50px;
          padding-top: 20px;
          border-top: 2px solid #e2e8f0;
          text-align: center;
        }

        .footer-text {
          font-size: 12px;
          color: #64748b;
          margin: 6px 0;
        }

        .print-controls {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          gap: 12px;
          z-index: 1000;
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          text-decoration: none;
          color: white;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
        }

        .btn-secondary {
          background: #64748b;
          color: white;
        }

        .btn-secondary:hover {
          background: #475569;
        }
      `}</style>

      <div className="print-controls no-print">
        <button onClick={() => window.print()} className="btn btn-primary">
          🖨️ Print Invoice
        </button>
        <a href="/bills" className="btn btn-secondary">
          ← Back to Bills
        </a>
      </div>

      <div className="invoice-container">
        <div className="invoice-header">
          <div className="company-info">
            <h1>Subahan Billing</h1>
            <p>Electronic Billing Solutions</p>
            <p>Kuwait</p>
            <p>Tel: +965 XXXX XXXX</p>
            <p>Email: info@subahan.com</p>
          </div>
          <div className="invoice-details">
            <div className="invoice-label">INVOICE</div>
            <div className="detail-row">
              <span className="detail-label">Invoice No:</span>
              <span className="detail-value">{invoiceNumber}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Date:</span>
              <span className="detail-value">{invoiceDate.toLocaleDateString('en-GB')}</span>
            </div>
          </div>
        </div>

        <div className="bill-info-grid">
          <div className="info-block">
            <div className="info-label">Bill ID</div>
            <div className="info-value">{bill.id}</div>
          </div>
          <div className="info-block">
            <div className="info-label">Customer</div>
            <div className="info-value">{bill.customer || "Walk-in Customer"}</div>
          </div>
          <div className="info-block">
            <div className="info-label">Issue Date</div>
            <div className="info-value">{invoiceDate.toLocaleString('en-GB')}</div>
          </div>
          <div className="info-block">
            <div className="info-label">Payment Status</div>
            <div className="info-value">Paid</div>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '10%' }}>Item No.</th>
              <th style={{ width: '35%' }}>Description</th>
              <th className="text-center" style={{ width: '10%' }}>Unit</th>
              <th className="text-center" style={{ width: '10%' }}>Qty.</th>
              <th className="text-right" style={{ width: '15%' }}>Unit Price</th>
              <th className="text-right" style={{ width: '20%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => {
              const lineTotal = item.unitPrice * item.quantity;
              const unitPriceFils = Math.round((item.unitPrice % 1) * 1000);
              const unitPriceKD = Math.floor(item.unitPrice * 1000) / 1000;
              const totalFils = Math.round((lineTotal % 1) * 1000);
              const totalKD = Math.floor(lineTotal * 1000) / 1000;

              return (
                <tr key={idx}>
                  <td className="item-no">{item.itemId}</td>
                  <td className="item-name">{item.itemName}</td>
                  <td className="text-center">
                    <span className="unit-badge">{item.unit}</span>
                  </td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">
                    <div className="price-split">
                      <span className="fils">{unitPriceFils}</span>
                      <span className="kd">{unitPriceKD.toFixed(3)}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="price-split">
                      <span className="fils">{totalFils}</span>
                      <span className="kd">{totalKD.toFixed(3)}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="total-section">
          <div className="total-box">
            <div className="total-row">
              <span className="total-label">Total K.D.</span>
              <span className="total-value">{bill.totalAmount.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div className="invoice-footer">
          <div style={{ 
            padding: '20px', 
            background: '#f8f9fa', 
            borderRadius: '4px', 
            marginBottom: '20px',
            textAlign: 'left'
          }}>
            <p className="footer-text" style={{ fontWeight: '600', marginBottom: '10px' }}>
              Terms & Conditions:
            </p>
            <p className="footer-text" style={{ textAlign: 'left' }}>
              The Goods Sold can be exchanged and returned Within 15 days With The Original Invoice.
            </p>
            <p className="footer-text" style={{ textAlign: 'left' }}>
              Received The Above Goods Complete And In Good Condition.
            </p>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr', 
            gap: '40px',
            marginTop: '40px' 
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #333', marginBottom: '8px', paddingBottom: '30px' }}></div>
              <p className="footer-text" style={{ fontWeight: '600' }}>SELLER'S NAME & SIG.</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '2px solid #333', marginBottom: '8px', paddingBottom: '30px' }}></div>
              <p className="footer-text" style={{ fontWeight: '600' }}>RECIPIENT'S NAME</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
