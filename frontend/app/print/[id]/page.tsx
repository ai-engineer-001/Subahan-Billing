"use client";

import { use, useEffect, useState } from "react";
import Head from "next/head";
import Spinner from "../../../components/Spinner";
import { apiFetch } from "../../../lib/api";

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
      
      // iOS Safari needs extra time to render before printing
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        // Give iOS more time to render the page properly
        setTimeout(() => {
          document.body.style.opacity = '1';
        }, 300);
        
        // Set viewport for proper print rendering on iOS
        let viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, shrink-to-fit=no');
        }
      }
    }
  }, [bill]);

  const handlePrint = () => {
    // iOS Safari-specific print handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    if (isIOS) {
      // Force layout recalculation before printing on iOS
      document.body.offsetHeight;
      setTimeout(() => {
        window.print();
      }, 100);
    } else {
      window.print();
    }
  };

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
      <Head>
        <title>Invoice {invoiceNumber}</title>
        <meta name="description" content={`Invoice for ${bill.customer || 'Customer'}`} />
        <style type="text/css" media="print">{`
          @page { size: auto; margin: 0mm; }
        `}</style>
      </Head>
      
      <style jsx global>{`
        @media print {
          /* Aggressively hide browser headers and footers */
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          
          html {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            margin: 0 !important;
            padding: 12mm 10mm 25mm 10mm !important;
          }
        }
      `}</style>
      
      <style jsx>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }

          .no-print {
            display: none !important;
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          .invoice-container {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            transform: none !important;
          }
          
          /* iOS Safari: Replace flexbox with block layout */
          .invoice-header {
            display: block !important;
            border-radius: 0 !important;
          }
          
          .total-row {
            display: block !important;
            text-align: right !important;
          }
          
          .total-label,
          .total-value {
            display: inline-block !important;
          }
          
          /* iOS Safari: Replace grid with table layout */
          .signature-section {
            display: table !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          .signature-box {
            display: table-cell !important;
            width: 50% !important;
            padding: 0 15px !important;
          }
          
          /* Remove problematic styles for iOS */
          .invoice-header,
          .invoice-label,
          .bill-info-box,
          .total-box,
          .terms-box {
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          
          thead {
            display: table-header-group !important;
          }
          
          tr {
            page-break-inside: avoid !important;
          }
          
          tbody tr {
            page-break-inside: avoid !important;
          }
          
          /* Ensure table prints correctly */
          .invoice-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          
          /* Position signature at bottom of last page */
          .invoice-footer {
            page-break-inside: avoid !important;
            margin-top: 30mm !important;
            position: relative !important;
          }
          
          .signature-section {
            page-break-inside: avoid !important;
            margin-top: 20mm !important;
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
          font-variant-numeric: tabular-nums;
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

        .num-cell {
          text-align: center;
          font-variant-numeric: tabular-nums;
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
          margin-top: 60px;
          page-break-inside: avoid;
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
          display: table;
          width: 100%;
          margin-top: 40px;
          border-collapse: collapse;
          page-break-inside: avoid;
        }

        .signature-box {
          display: table-cell;
          width: 50%;
          text-align: center;
          padding: 0 20px;
          vertical-align: bottom;
        }

        .signature-line {
          border-bottom: 2px solid #8b7355;
          margin-bottom: 10px;
          padding-bottom: 40px;
          min-height: 50px;
        }

        .signature-label {
          font-size: 12px;
          font-weight: 700;
          color: #2c1810;
          text-transform: uppercase;
          line-height: 1.6;
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

        /* iOS-specific fixes */
        @supports (-webkit-touch-callout: none) {
          .invoice-header,
          .total-row {
            display: block;
          }
          
          .signature-section {
            display: table;
          }
          
          .signature-box {
            display: table-cell;
          }
        }
        
        @media (max-width: 768px) {
          .invoice-container {
            max-width: 100%;
            margin: 8px;
            padding: 16px;
          }

          .invoice-header {
            display: block;
          }

          .invoice-label {
            font-size: 22px;
            padding: 8px 16px;
          }

          .invoice-table {
            font-size: 10px;
          }

          .invoice-table th,
          .invoice-table td {
            padding: 6px 4px;
            font-size: 10px;
          }
          
          .company-info h1 {
            font-size: 20px;
          }
          
          .company-info p {
            font-size: 11px;
          }
        }
      `}</style>

      <div className="print-controls no-print">
        <button onClick={handlePrint} className="btn btn-primary">
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
              <th className="text-left" style={{ width: '30%' }}>تفاصيل البضاعة<br/>Description</th>
              <th style={{ width: '8%' }}>الوحدة<br/>Unit</th>
              <th style={{ width: '7%' }}>الكمية<br/>Qty.</th>
              <th style={{ width: '12%' }}>سعر الوحدة<br/>Unit Price (KWD)</th>
              <th style={{ width: '12%' }}>خصم/وحدة<br/>Discount /Unit</th>
              <th style={{ width: '12%' }}>الإجمالي<br/>Subtotal (KWD)</th>
              <th style={{ width: '11%' }}>الربح<br/>Profit (KWD)</th>
            </tr>
          </thead>
          <tbody>
            {bill.items.map((item, idx) => {
              const discountPerUnit = Math.max(0, item.baseSellingPrice - item.unitPrice);
              const lineTotal = item.unitPrice * item.quantity;
              const lineProfit = item.buyingPrice != null
                ? (item.unitPrice - item.buyingPrice) * item.quantity
                : null;

              return (
                <tr key={idx}>
                  <td><span className="item-no">{item.itemId}</span></td>
                  <td className="text-left">
                    <span className="item-name">{item.itemName}</span>
                    {item.arabicName && <span className="item-name-ar">{item.arabicName}</span>}
                  </td>
                  <td><span className="unit-text">{item.unit}</span></td>
                  <td className="num-cell">{item.quantity}</td>
                  <td className="num-cell">{item.unitPrice.toFixed(3)}</td>
                  <td className="num-cell">{discountPerUnit.toFixed(3)}</td>
                  <td className="num-cell">{lineTotal.toFixed(3)}</td>
                  <td className="num-cell">{lineProfit === null ? "—" : lineProfit.toFixed(3)}</td>
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
