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
};

type Bill = {
  id: string;
  customer?: string | null;
  totalAmount: number;
  createdAt: string;
  items: BillItem[];
};

/*
 * Row capacity per page (conservative for cross-browser safety).
 *
 * A4 = 297 mm tall.  With 6 mm top + 8 mm bottom padding → 283 mm usable.
 * Header block ≈ 46 mm · thead ≈ 18 mm · tfoot ≈ 9 mm · footer ≈ 48 mm
 * Each data row ≈ 7 mm  (26 px at 96 dpi).
 *
 * SINGLE  = header + thead + data + tfoot + footer  → (283-46-18-9-48)/7 ≈ 23  → use 20
 * FIRST   = header + thead + data                   → (283-46-18)/7      ≈ 31  → use 26
 * MIDDLE  = thead + data                            → (283-18)/7         ≈ 37  → use 32
 * LAST    = thead + data + tfoot + footer            → (283-18-9-48)/7   ≈ 29  → use 24
 */
const ROWS_SINGLE = 18;
const ROWS_FIRST  = 30;
const ROWS_MIDDLE = 32;
const ROWS_LAST   = 24;

type Page = {
  items: BillItem[];
  fillTo: number;
  isFirst: boolean;
  isLast: boolean;
};

function paginate(items: BillItem[]): Page[] {
  if (items.length <= ROWS_SINGLE) {
    return [{ items, fillTo: ROWS_SINGLE, isFirst: true, isLast: true }];
  }

  const pages: Page[] = [];
  let i = 0;

  // First page (has header, no footer)
  pages.push({
    items: items.slice(0, ROWS_FIRST),
    fillTo: ROWS_FIRST,
    isFirst: true,
    isLast: false,
  });
  i = ROWS_FIRST;

  while (i < items.length) {
    const left = items.length - i;
    if (left <= ROWS_LAST) {
      // Last page (has footer)
      pages.push({
        items: items.slice(i),
        fillTo: ROWS_LAST,
        isFirst: false,
        isLast: true,
      });
      i = items.length;
    } else {
      // Middle page
      pages.push({
        items: items.slice(i, i + ROWS_MIDDLE),
        fillTo: ROWS_MIDDLE,
        isFirst: false,
        isLast: false,
      });
      i += ROWS_MIDDLE;
    }
  }

  return pages;
}

function splitKD(price: number) {
  const kd = Math.floor(price);
  const fils = Math.round((price - kd) * 1000)
    .toString()
    .padStart(3, "0");
  return { kd: kd.toString(), fils };
}

export default function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [bill, setBill] = useState<Bill | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Bill>(`/bills/${id}`)
      .then(setBill)
      .catch((err) =>
        setStatus(err instanceof Error ? err.message : "Failed to load bill")
      );
  }, [id]);

  /* Force desktop-width viewport so mobile Safari shows the exact same layout */
  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]');
    if (vp) vp.setAttribute("content", "width=800");
  }, []);

  useEffect(() => {
    if (bill) {
      document.title = `Invoice ${bill.id.slice(0, 8)}`;
    }
  }, [bill]);

  const handlePrint = () => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (iOS) {
      document.body.offsetHeight; // force layout
      setTimeout(() => window.print(), 150);
    } else {
      window.print();
    }
  };

  /* ---------- loading / error ---------- */
  if (status)
    return (
      <div className="loading-screen">
        <p className="notice">{status}</p>
      </div>
    );
  if (!bill)
    return (
      <div className="loading-screen">
        <Spinner size={48} />
        <p>Loading bill…</p>
      </div>
    );

  /* ---------- data ---------- */
  const invoiceDate = new Date(bill.createdAt);
  const invoiceNumber = bill.id.slice(0, 13).toUpperCase();
  const totalSplit = splitKD(bill.totalAmount);
  const pages = paginate(bill.items);

  /* ---------- sub-components ---------- */

  const TableHead = () => (
    <thead>
      <tr>
        <th rowSpan={2} style={{ width: '30%', border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          التفاصيـــل Description
        </th>
        <th rowSpan={2} style={{ width: '8%', border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          الوحدة
          <br />
          Unit
        </th>
        <th rowSpan={2} style={{ width: '7%', border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          الكمية
          <br />
          Qty.
        </th>
        <th colSpan={2} style={{ width: '19%', border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          سعر الوحدة
          <br />
          Unit Price
        </th>
        <th colSpan={2} style={{ width: '36%', border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          المبلغ الاجمالي
          <br />
          Total Amount
        </th>
      </tr>
      <tr>
        <th style={{ border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          دينار
          <br />
          K.D.
        </th>
        <th style={{ border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          فلس
          <br />
          Fils
        </th>
        <th style={{ border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          دينار
          <br />
          K.D.
        </th>
        <th style={{ border: '1px solid #6b5440', background: '#f7f0e2', padding: '5px 4px' }}>
          فلس
          <br />
          Fils
        </th>
      </tr>
    </thead>
  );

  const renderRow = (item: BillItem, idx: number) => {
    const lt = item.unitPrice * item.quantity;
    const ps = splitKD(item.unitPrice);
    const ts = splitKD(lt);
    const bg = idx % 2 === 0 ? '#fff' : '#fdfaf4';
    const s = { border: '1px solid #6b5440', height: 26, background: bg, textAlign: 'center' as const } as React.CSSProperties;
    return (
      <tr key={idx}>
        <td className="desc" style={{...s, textAlign: 'left', paddingLeft: 8}}>
          {item.arabicName && <span className="it-ar">{item.arabicName}</span>}
          <span className="it-nm">{item.itemName}</span>
        </td>
        <td className="unit" style={s}>{item.unit}</td>
        <td style={s}>{item.quantity}</td>
        <td style={s}>{ps.kd}</td>
        <td style={s}>{ps.fils}</td>
        <td style={s}>{ts.kd}</td>
        <td style={s}>{ts.fils}</td>
      </tr>
    );
  };

  const B = '1px solid #6b5440';
  const emptyRows = (n: number) =>
    Array.from({ length: Math.max(0, n) }).map((_, i) => (
      <tr key={`e${i}`} className="empty-row">
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
        <td style={{border:B,height:26,background:i%2===0?'#fff':'#fdfaf4'}}>&nbsp;</td>
      </tr>
    ));

  /* ================================================================ */
  return (
    <>
      <Head>
        <title>Invoice {invoiceNumber}</title>
        <style type="text/css" media="print">{`
          @page { size: A4 portrait; margin: 0mm; }
        `}</style>
      </Head>

      {/* ---------- global print reset ---------- */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: #fff !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
      `}</style>

      {/* ---------- scoped styles ---------- */}
      <style jsx>{`
        /* === print === */
        @media print {
          .no-print {
            display: none !important;
          }
          .sheet {
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .pg-num {
            display: none !important;
          }
          .inv-tbl,
          .inv-tbl th,
          .inv-tbl td {
            border: 1px solid var(--bdr) !important;
            page-break-inside: avoid;
          }
          .inv-tbl tbody tr.empty-row td {
            border: 1px solid var(--bdr) !important;
          }
        }

        /* === palette === */
        :global(:root) {
          --bdr: #6b5440;
          --bdr-l: #8b7355;
          --bg-cr: #f7f0e2;
          --bg-hd: #f0e8d4;
          --c1: #2c1810;
          --c2: #5c4033;
        }

        /* === sheet (one A4 page) === */
        .sheet {
          width: 210mm;
          min-height: 297mm;
          padding: 6mm 8mm 8mm 8mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          margin: 0 auto 24px auto;
          background: #fffdf8;
          color: var(--c1);
          font-family: "Times New Roman", "Noto Naskh Arabic", serif;
          line-height: 1.35;
          box-shadow: 0 2px 20px rgba(90, 70, 50, 0.12);
          border: 1px solid #e8e0d0;
          page-break-after: always;
          break-after: page;
        }
        .sheet:last-child {
          page-break-after: auto;
          break-after: auto;
          margin-bottom: 0;
        }

        /* === header === */
        .hdr-wrap {
          border: 2px solid var(--bdr);
          border-radius: 12px;
          overflow: hidden;
          background: var(--bg-hd);
          margin-bottom: 10px;
        }
        .hdr-tbl {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .hdr-tbl td {
          padding: 12px 16px;
          vertical-align: top;
          border: none;
        }
        .hdr-en {
          width: 32%;
          text-align: left;
        }
        .hdr-en h2 {
          margin: 0 0 6px;
          font-size: 17px;
          font-weight: 800;
          color: var(--c1);
          letter-spacing: 0.5px;
        }
        .hdr-en p {
          margin: 2px 0;
          font-size: 8.5px;
          color: var(--c2);
          line-height: 1.5;
        }
        .hdr-mid {
          width: 36%;
          text-align: center;
          vertical-align: middle !important;
          border-left: 1px solid var(--bdr-l);
          border-right: 1px solid var(--bdr-l);
        }
        .hdr-mid .ti-ar {
          font-size: 14px;
          font-weight: 700;
          color: var(--c1);
          margin: 0 0 4px;
          direction: rtl;
        }
        .hdr-mid .ti-en {
          font-size: 12px;
          font-weight: 700;
          color: var(--c1);
          margin: 0;
          letter-spacing: 0.5px;
        }
        .hdr-ar {
          width: 32%;
          text-align: right;
          direction: rtl;
        }
        .hdr-ar .co-lbl {
          font-size: 14px;
          font-weight: 600;
          color: var(--c2);
          margin: 0;
        }
        .hdr-ar .co-nm {
          font-size: 34px;
          font-weight: 700;
          color: var(--c1);
          margin: 2px 0 5px;
          line-height: 1.05;
          letter-spacing: 1px;
        }
        .hdr-ar .co-sub {
          font-size: 10px;
          font-weight: 700;
          color: var(--c1);
          margin: 3px 0;
        }
        .hdr-ar p {
          margin: 1px 0;
          font-size: 8.5px;
          color: var(--c2);
          line-height: 1.5;
        }

        /* === info rows === */
        .info-tbl {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0 6px;
          table-layout: fixed;
        }
        .info-tbl td {
          padding: 4px 2px;
          font-size: 11px;
          color: var(--c1);
          border: none;
          vertical-align: bottom;
        }
        .info-tbl .lbl {
          font-weight: 700;
          white-space: nowrap;
        }
        .info-tbl .no-val {
          font-size: 18px;
          font-weight: 800;
        }
        .info-tbl .val {
          border-bottom: 1px solid var(--bdr-l);
          padding-bottom: 2px;
        }
        .info-tbl .ar-lbl {
          text-align: right;
          direction: rtl;
          font-weight: 600;
          color: var(--c2);
        }

        /* === data table === */
        .tbl-wrap {
          border: 2px solid var(--bdr);
          border-radius: 6px;
          overflow: hidden;
          margin-top: 6px;
        }
        .inv-tbl {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
          table-layout: fixed;
        }
        .inv-tbl th,
        .inv-tbl td {
          border: 1px solid #6b5440;
          padding: 5px 4px;
          text-align: center;
          vertical-align: middle;
          color: #2c1810;
        }
        .inv-tbl thead th {
          background: #f7f0e2;
          font-weight: 700;
          font-size: 9px;
          line-height: 1.35;
        }
        .inv-tbl tbody td {
          font-size: 11px;
          vertical-align: top;
          padding: 6px 5px;
          height: 26px;
          background: #fff;
        }
        .inv-tbl tbody tr:nth-child(even) td {
          background: #fdfaf4;
        }
        .inv-tbl tbody tr.empty-row td {
          height: 26px;
          padding: 0;
        }
        .inv-tbl td.desc {
          text-align: left;
          padding-left: 8px;
        }
        .inv-tbl .it-ar {
          display: block;
          font-size: 9px;
          direction: rtl;
          text-align: right;
          margin-bottom: 2px;
          color: #5c4033;
        }
        .inv-tbl .it-nm {
          display: block;
          font-size: 11px;
          font-weight: 500;
        }
        .inv-tbl .unit {
          font-weight: 600;
          font-size: 10px;
          text-transform: capitalize;
          color: var(--c2);
        }
        .inv-tbl tfoot td {
          background: #f7f0e2;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 6px;
          height: auto;
          border: 1px solid #6b5440;
          border-top: 2px solid #6b5440;
        }
        .inv-tbl tfoot .tot-lbl {
          text-align: left;
          padding-left: 10px;
          font-size: 12px;
        }
        .inv-tbl tfoot .tot-ar {
          float: right;
          direction: rtl;
          margin-right: 10px;
          font-size: 13px;
        }

        /* === page number === */
        .pg-num {
          text-align: center;
          font-size: 8px;
          color: var(--c2);
          margin-top: 6px;
        }

        /* === terms === */
        .footer-section {
          margin-top: auto;
          padding-top: 14px;
          page-break-inside: avoid;
        }
        .terms {
          margin-bottom: 12px;
          padding-top: 8px;
          border-top: 1px solid var(--bdr-l);
        }
        .terms p {
          font-size: 8px;
          direction: rtl;
          text-align: right;
          margin: 2px 0;
          line-height: 1.8;
          color: var(--c2);
        }

        /* === signatures === */
        .sig-area {
          margin-top: 20px;
          direction: rtl;
          text-align: right;
        }
        .sig-row {
          margin: 16px 0;
          display: block;
        }
        .sig-lbl {
          font-size: 11px;
          font-weight: 700;
          color: var(--c1);
          display: inline;
        }
        .sig-dots {
          display: inline-block;
          width: 240px;
          border-bottom: 1.5px dotted var(--bdr-l);
          margin-right: 8px;
          vertical-align: bottom;
        }

        /* === buttons === */
        .pbar {
          position: fixed;
          top: 15px;
          right: 15px;
          display: flex;
          gap: 10px;
          z-index: 1000;
        }
        .pb {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          color: #fff;
          transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .pb-blue {
          background: #2563eb;
        }
        .pb-blue:hover {
          background: #1d4ed8;
          transform: translateY(-1px);
        }
        .pb-gray {
          background: #64748b;
        }
        .pb-gray:hover {
          background: #475569;
        }
      `}</style>

      {/* ---- buttons ---- */}
      <div className="pbar no-print">
        <button onClick={handlePrint} className="pb pb-blue">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9V2h12v7" />
            <path d="M6 18h12v4H6z" />
            <path d="M6 14h12" />
            <path d="M4 14a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2" />
          </svg>
          Print Invoice
        </button>
        <a href="/bills" className="pb pb-gray">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Back
        </a>
      </div>

      {/* ================================================================
          PAGES — each .sheet = one printed A4 page
          ================================================================ */}
      {pages.map((pg, pi) => (
        <div key={pi} className="sheet">
          {/* ---- Header (page 1 only) ---- */}
          {pg.isFirst && (
            <>
              <div className="hdr-wrap">
                <table className="hdr-tbl">
                  <tbody>
                    <tr>
                      <td className="hdr-en">
                        <h2>SUBHAN Co.</h2>
                        <p>
                          <b>Electrical Equipments</b>
                        </p>
                        <p>Jahra Industrial Area - Transport Area</p>
                        <p>Bldg. 14 - Shop No. 21</p>
                        <p>C.R. 330574</p>
                        <p>Mob. : 99333505</p>
                      </td>
                      <td className="hdr-mid">
                        <p className="ti-ar">فاتورة نقداً / بالحساب</p>
                        <p className="ti-en">CASH / CREDIT INVOICE</p>
                      </td>
                      <td className="hdr-ar">
                        <p className="co-lbl">شركة</p>
                        <p className="co-nm">سبحان</p>
                        <p className="co-sub">
                          لبيع وتصليح الأدوات الكهربائية
                        </p>
                        <p>الجهراء الصناعية - القطعة نقل عام</p>
                        <p>القسيمة ١٤ - محل رقم ٢١</p>
                        <p>س. ت. ٣٣٠٥٧٤</p>
                        <p>نقال : ٩٩٣٣٣٥٠٥</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <table className="info-tbl">
                <tbody>
                  <tr>
                    <td className="lbl" style={{ width: "30px" }}>
                      NO.
                    </td>
                    <td className="no-val" style={{ width: "35%" }}>
                      {invoiceNumber}
                    </td>
                    <td style={{ width: "15%" }} />
                    <td
                      className="lbl"
                      style={{ width: "40px", textAlign: "right" }}
                    >
                      Date:
                    </td>
                    <td
                      className="val"
                      style={{ width: "25%", textAlign: "center" }}
                    >
                      {invoiceDate.toLocaleDateString("en-GB")}
                    </td>
                  </tr>
                  <tr>
                    <td className="lbl" style={{ width: "60px" }}>
                      Mr./M/s.
                    </td>
                    <td className="val" colSpan={2}>
                      {bill.customer || ""}
                    </td>
                    <td className="ar-lbl" colSpan={2}>
                      السيد / السادة
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* ---- Table ---- */}
          <div className="tbl-wrap">
            <table className="inv-tbl">
              <TableHead />
              <tbody>
                {pg.items.map(renderRow)}
                {emptyRows(pg.fillTo - pg.items.length)}
              </tbody>
              {pg.isLast && (
                <tfoot>
                  <tr>
                    <td colSpan={7} className="tot-lbl" style={{border:'1px solid #6b5440',borderTop:'2px solid #6b5440',background:'#f7f0e2',padding:'8px 6px',textAlign:'left',paddingLeft:10,fontWeight:700,fontSize:13}}>
                      Total K.D.
                      <span className="tot-ar">المجموع د.ك.</span>
                    </td>
                    <td style={{border:'1px solid #6b5440',borderTop:'2px solid #6b5440',background:'#f7f0e2',padding:'8px 6px',fontWeight:700,fontSize:13,textAlign:'center'}}>{totalSplit.kd}</td>
                    <td style={{border:'1px solid #6b5440',borderTop:'2px solid #6b5440',background:'#f7f0e2',padding:'8px 6px',fontWeight:700,fontSize:13,textAlign:'center'}}>{totalSplit.fils}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ---- Page indicator (multi-page) ---- */}
          {pages.length > 1 && (
            <p className="pg-num">
              Page {pi + 1} / {pages.length}
            </p>
          )}

          {/* ---- Footer (last page only) ---- */}
          {pg.isLast && (
            <div className="footer-section">
              <div className="terms">
                <p>
                  تعتبر هذه الفاتورة بمثابة كمبيالة رسمية مستحقة السداد عند
                  التخلف عن الدفع بموجب هذه الفاتورة.
                </p>
                <p>
                  البضاعة المباعة قابلة للاستبدال والاسترجاع خلال ١٥ يوم من
                  تاريخ الفاتورة.
                </p>
                <p>
                  البضاعة المباعة من المحل هو إقرار العميل باستلامها كاملة
                  وبحالة جيدة.
                </p>
              </div>
              <div className="sig-area">
                <div className="sig-row">
                  <span className="sig-lbl">باسم /</span>
                  <span className="sig-dots" />
                </div>
                <div className="sig-row">
                  <span className="sig-lbl">رقم المدني</span>
                  <span className="sig-dots" />
                </div>
                <div className="sig-row">
                  <span className="sig-lbl">توقيع المستلم</span>
                  <span className="sig-dots" />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}
