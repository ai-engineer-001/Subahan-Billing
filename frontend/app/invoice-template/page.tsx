"use client";

const emptyRows = Array.from({ length: 15 }, (_, index) => index);

const invoice = {
  invoiceNo: "14",
  date: "15/01/2026",
  lpoNo: "",
  purchaseOrderNo: "",
  customer: "______________________________",
  credit: "Credit / أجل",
  totalKd: "5071",
  totalFils: "480",
  amountInWordsEn: "The Sum of: ________________________________________________",
  amountInWordsAr: "خمسة آلاف وواحد وسبعون دينارا كويتيا وأربعمائة وثمانون فلسا",
};

const totalKwd = `${invoice.totalKd}.${String(invoice.totalFils).padStart(3, "0")}`;

const showroomListEn = [
  "Showroom 1 - Hawally - Tel: 22621488",
  "Showroom 2 - Shuwaikh - Tel: 22613062",
  "Showroom 3 - Farwaniya - Tel: 22631109",
  "Showroom 4 - Hawally - Tel: 22613062",
  "Showroom 5 - Al-Jahra - Tel: 26606515",
  "Showroom 6 - Salmiya - Tel: 22606511",
  "Showroom 7 - Khaitan - Tel: 22606511",
  "Showroom 8 - Fahaheel - Tel: 23660151",
];

const showroomListAr = [
  "المعرض 1 - حولي - هاتف 22621488",
  "المعرض 2 - الشويخ - هاتف 22613062",
  "المعرض 3 - الفروانية - هاتف 22631109",
  "المعرض 4 - حولي - هاتف 22613062",
  "المعرض 5 - الجهراء - هاتف 26606515",
  "المعرض 6 - السالمية - هاتف 22606511",
  "المعرض 7 - خيطان - هاتف 22606511",
  "المعرض 8 - الفحيحيل - هاتف 23660151",
];

export default function InvoiceTemplatePage() {
  return (
    <div className="invoice-page">
      <div className="invoice-header">
        <div className="invoice-col ltr">
          <p className="invoice-company">Emara Al-Ahlia for Electrical & Electronic Contractors Co.</p>
          <p className="invoice-subtitle">Head Office - Hawally</p>
          <div className="invoice-list">
            {showroomListEn.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>

        <div className="invoice-col center">
          <div className="invoice-logo">EMARA</div>
          <p className="invoice-url">www.emarakw.com</p>
        </div>

        <div className="invoice-col rtl" dir="rtl">
          <p className="invoice-company">شركة عمارة الأهلية للمقاولات الكهربائية والإلكترونية</p>
          <p className="invoice-subtitle">المكتب الرئيسي - حولي</p>
          <div className="invoice-list">
            {showroomListAr.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>

      <div className="invoice-info">
        <div className="info-row">
          <div className="info-cell">Invoice No: {invoice.invoiceNo}</div>
          <div className="info-title">Sales Invoice / فاتورة مبيعات</div>
          <div className="info-cell">Date: {invoice.date}</div>
        </div>
        <div className="info-row">
          <div className="info-cell">L.P.O. No: {invoice.lpoNo}</div>
          <div className="info-cell center">{invoice.credit}</div>
          <div className="info-cell">Purchase Order No: {invoice.purchaseOrderNo}</div>
        </div>
        <div className="info-row full">
          <div className="info-cell">
            Mr. / Messrs: {invoice.customer}
            <span className="info-ar" dir="rtl">السيد / السادة</span>
          </div>
        </div>
      </div>

      <div className="invoice-table-wrap">
        <div className="invoice-watermark">EMARA</div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th className="col-item">Item No.</th>
              <th className="col-desc">Description</th>
              <th className="col-unit">Unit</th>
              <th className="col-qty">Qty.</th>
              <th className="col-price">Unit Price (KWD)</th>
              <th className="col-subtotal">Subtotal (KWD)</th>
              <th className="col-profit">Profit (KWD)</th>
            </tr>
          </thead>
          <tbody>
            {emptyRows.map((row) => (
              <tr key={row}>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="total-label">Total KWD</td>
              <td className="col-subtotal">{totalKwd}</td>
              <td className="col-profit">&nbsp;</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="invoice-amount">
        <div className="amount-en">{invoice.amountInWordsEn}</div>
        <div className="amount-ar" dir="rtl">{invoice.amountInWordsAr}</div>
      </div>

      <div className="invoice-terms">
        <p>Goods Sold can be exchanged and returned within 15 days with the original invoice.</p>
        <p dir="rtl">البضاعة المباعة يمكن استبدالها أو إرجاعها خلال 15 يومًا مع الفاتورة الأصلية.</p>
      </div>

      <div className="invoice-signatures">
        <div className="signature-block">
          <div className="signature-line"></div>
          <span>SELLER'S NAME &amp; SIG.</span>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <span>RECIPIENT'S NAME</span>
        </div>
      </div>

      <div className="invoice-contact">E-mail: emara_co@hotmail.com</div>
    </div>
  );
}
