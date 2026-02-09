"use client";

import { use, useEffect, useState } from "react";
import Spinner from "../../../../components/Spinner";
import { apiFetch } from "../../../lib/api";

type BillItem = {
  itemId: string;
  itemName: string;
  arabicName: string;
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
        <Spinner size={48} />
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
          @page {
            margin: 12mm 10mm 18mm;
          }

          .no-print {
            display: none !important;
          }
          body {
            margin: 0;
            padding: 0;
          }
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .invoice-container {
            max-width: 100%;
            margin: 0;
            padding: 10mm;
            box-shadow: none;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
        }

        .invoice-container {
          max-width: 210mm;
          margin: 8px auto;
          padding: 12mm;
          width: 100%;
          box-sizing: border-box;
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
        }

        .invoice-header {
          background: #f5f0de;
          border: 2px solid #8b7355;
          border-radius: 25px;
          padding: 20px 30px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .company-info h1 {
          margin: 0 0 5px 0;
          font-size: 24px;
          color: #2c1810;
          font-weight: 700;
        }

        .company-info p {
          margin: 2px 0;
          font-size: 12px;
          color: #5c4033;
        }

        .invoice-label {
          font-size: 28px;
          font-weight: 700;
          color: #2c1810;
          text-align: center;
          background: #f5f0de;
          border: 2px solid #8b7355;
          border-radius: 15px;
          padding: 10px 40px;
          margin: 0 0 20px 0;
        }

        .bill-info-box {
          border: 2px solid #8b7355;
          border-radius: 10px;
          padding: 15px 20px;
          margin-bottom: 20px;
          background: white;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #e0d5c7;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 13px;
          font-weight: 600;
          color: #5c4033;
        }

        .info-value {
          font-size: 13px;
          color: #2c1810;
          font-weight: 500;
        }

        .invoice-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 12px;
          table-layout: fixed;
        }

        .invoice-table thead {
          background: #f5f0de;
        }

        .invoice-table th {
          padding: 10px 8px;
          text-align: center;
          font-weight: 700;
          color: #2c1810;
          border: 2px solid #8b7355;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .invoice-table th.text-left {
          text-align: left;
        }

        .invoice-table td {
          padding: 10px 8px;
          border: 2px solid #8b7355;
          color: #2c1810;
          text-align: center;
          word-break: break-word;
        }

        .invoice-table td.text-left {
          text-align: left;
        }

        .invoice-table tbody tr:nth-child(even) {
          background: #fafaf8;
        }

        .item-no {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          color: #2c1810;
          font-size: 12px;
        }

        .item-name {
          font-weight: 500;
          text-align: left;
        }

        .item-name-ar {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: #5c4033;
          direction: rtl;
          text-align: right;
        }

        .unit-text {
          font-weight: 600;
          text-transform: uppercase;
          color: #5c4033;
        }

        .price-cell {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 5px;
        }

        .price-cell .fils {
          flex: 0 0 50px;
          text-align: right;
          color: #5c4033;
          font-size: 11px;
        }

        .price-cell .kd {
          flex: 1;
          text-align: right;
          font-weight: 600;
          color: #2c1810;
        }

        .total-section {
          margin-top: 20px;
        }

        .total-box {
          width: 100%;
          background: #f5f0de;
          border: 3px solid #8b7355;
          border-radius: 10px;
          padding: 20px 30px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .total-label {
          font-size: 20px;
          font-weight: 700;
          color: #2c1810;
        }

        .total-value {
          font-size: 24px;
          font-weight: 700;
          color: #2c1810;
        }

        .invoice-footer {
          margin-top: 30px;
        }

        .terms-box {
          border: 2px solid #8b7355;
          border-radius: 10px;
          padding: 15px 20px;
          background: #fafaf8;
          margin-bottom: 20px;
        }

        .footer-text {
          font-size: 11px;
          color: #5c4033;
          margin: 5px 0;
          line-height: 1.5;
        }

        .footer-title {
          font-weight: 700;
          color: #2c1810;
          margin-bottom: 8px;
        }

        .signature-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-top: 30px;
        }

        .signature-box {
          text-align: center;
        }

        .signature-line {
          border-bottom: 2px solid #8b7355;
          margin-bottom: 8px;
          padding-bottom: 30px;
        }

        .signature-label {
          font-size: 12px;
          font-weight: 700;
          color: #2c1810;
          text-transform: uppercase;
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

        @media (max-width: 768px) {
          .invoice-container {
            max-width: 100%;
            margin: 8px;
            padding: 16px;
          }

          .invoice-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .invoice-label {
            font-size: 22px;
            padding: 8px 16px;
          }

          .invoice-table {
            font-size: 11px;
          }

          .invoice-table th,
          .invoice-table td {
            padding: 6px 4px;
          }
        }
      `}</style>

      <div className="print-controls no-print">
        <button onClick={() => window.print()} className="btn btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V2h12v7" />
            <path d="M6 18h12v4H6z" />
            <path d="M6 14h12" />
            <path d="M4 14a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2" />
          </svg>
          Print Invoice
        </button>
        <a href="/bills" className="btn btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back to Bills
        </a>
      </div>

      <div className="invoice-container">
        <div className="invoice-header">
          <div className="company-info">
            <h1>Subahan Billing</h1>
            <p>Electronic Billing Solutions</p>
            <p>Kuwait • Tel: +965 XXXX XXXX</p>
            <p>Email: info@subahan.com</p>
          </div>
        </div>

        <div className="invoice-label">فاتورة مبيعات • INVOICE</div>

        <div className="bill-info-box">
          <div className="info-row">
            <span className="info-label">Date:</span>
            <span className="info-value">{invoiceDate.toLocaleDateString('en-GB')}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Customer / السادة:</span>
            <span className="info-value">{bill.customer || "Walk-in Customer"}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Invoice No:</span>
            <span className="info-value">{invoiceNumber}</span>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '8%' }}>رقم الصنف<br/>Item No.</th>
              <th className="text-left" style={{ width: '32%' }}>تفاصيل البضاعة<br/>Description</th>
              <th style={{ width: '10%' }}>الوحدة<br/>Unit</th>
              <th style={{ width: '8%' }}>الكمية<br/>Qty.</th>
              <th style={{ width: '10%' }}>قبس<br/>Fils</th>
              <th style={{ width: '12%' }}>دينار K.D.<br/>Unit Price</th>
              <th style={{ width: '10%' }}>قبس<br/>Fils</th>
              <th style={{ width: '10%' }}>الإجمالي<br/>Total K.D.</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => {
              const lineTotal = item.unitPrice * item.quantity;
              const unitPriceFils = Math.round((item.unitPrice % 1) * 1000);
              const totalFils = Math.round((lineTotal % 1) * 1000);

              return (
                <tr key={idx}>
                  <td><span className="item-no">{item.itemId}</span></td>
                  <td className="text-left">
                    <span className="item-name">{item.itemName}</span>
                    {item.arabicName && <span className="item-name-ar">{item.arabicName}</span>}
                  </td>
                  <td><span className="unit-text">{item.unit}</span></td>
                  <td>{item.quantity}</td>
                  <td>{unitPriceFils}</td>
                  <td>{item.unitPrice.toFixed(3)}</td>
                  <td>{totalFils}</td>
                  <td>{lineTotal.toFixed(3)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="total-section">
          <div className="total-box">
            <div className="total-row">
              <span className="total-label">المجموع • Total K.D.</span>
              <span className="total-value">{bill.totalAmount.toFixed(3)}</span>
            </div>
          </div>
        </div>

        <div className="invoice-footer">
          <div className="terms-box">
            <p className="footer-text footer-title">Terms & Conditions / الشروط والأحكام:</p>
            <p className="footer-text">
              The Goods Sold can be exchanged and returned Within 15 days With The Original Invoice.
            </p>
            <p className="footer-text">
              Received The Above Goods Complete And In Good Condition.
            </p>
          </div>
          
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line"></div>
              <p className="signature-label">Seller's Name & Sig.<br/>اسم وتوقيع البائع</p>
            </div>
            <div className="signature-box">
              <div className="signature-line"></div>
              <p className="signature-label">Recipient's Name<br/>اسم المستلم</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
