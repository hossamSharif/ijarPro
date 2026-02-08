'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Invoice, Company } from '@/lib/types/models';

interface InvoicePdfProps {
  invoice: Invoice & { id: string };
  company: Company | null;
  locale: string;
}

export function InvoicePdf({ invoice, company, locale }: InvoicePdfProps) {
  const t = useTranslations('invoices');
  const [generating, setGenerating] = useState(false);

  const generatePdf = useCallback(async () => {
    setGenerating(true);
    try {
      // Dynamic import for code splitting (client-side only)
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Load Amiri font for Arabic support
      try {
        const fontResponse = await fetch('/fonts/Amiri-Regular.ttf');
        const fontBuffer = await fontResponse.arrayBuffer();
        const fontBase64 = btoa(
          new Uint8Array(fontBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
        );
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');
      } catch {
        // Fallback to Helvetica if font loading fails
        doc.setFont('Helvetica');
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;

      // Company header
      if (company) {
        doc.setFontSize(16);
        doc.text(company.nameAr, pageWidth - margin, y, { align: 'right' });
        y += 7;
        doc.setFontSize(10);
        doc.text(company.nameEn, pageWidth - margin, y, { align: 'right' });
        y += 5;
        if (company.vatNumber) {
          doc.text(`VAT: ${company.vatNumber}`, pageWidth - margin, y, { align: 'right' });
          y += 5;
        }
        if (company.address) {
          const addr = `${company.address.streetAr}, ${company.address.districtAr}, ${company.address.cityAr}`;
          doc.text(addr, pageWidth - margin, y, { align: 'right' });
          y += 5;
        }
        if (company.phone) {
          doc.text(company.phone, pageWidth - margin, y, { align: 'right' });
          y += 5;
        }
      }

      y += 5;

      // Invoice title
      doc.setFontSize(18);
      const title = invoice.type === 'credit'
        ? (locale === 'ar' ? 'إشعار دائن' : 'Credit Note')
        : (locale === 'ar' ? 'فاتورة ضريبية' : 'Tax Invoice');
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Invoice details
      doc.setFontSize(10);
      const details = [
        [locale === 'ar' ? 'رقم الفاتورة' : 'Invoice No.', invoice.invoiceNumber],
        [locale === 'ar' ? 'التاريخ' : 'Date', invoice.invoiceDate.toDate().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')],
        [locale === 'ar' ? 'العميل' : 'Customer', locale === 'ar' ? invoice.customerNameAr : invoice.customerNameEn],
        [locale === 'ar' ? 'المبنى' : 'Building', `${invoice.buildingNameAr} — ${invoice.apartmentUnit}`],
        [locale === 'ar' ? 'فترة الإيجار' : 'Rental Period',
          `${invoice.rentalPeriodStart.toDate().toLocaleDateString('en-US')} — ${invoice.rentalPeriodEnd.toDate().toLocaleDateString('en-US')}`],
      ];

      details.forEach(([label, value]) => {
        doc.text(`${label}: ${value}`, pageWidth - margin, y, { align: 'right' });
        y += 6;
      });

      if (invoice.originalInvoiceNumber) {
        doc.text(
          `${locale === 'ar' ? 'الفاتورة الأصلية' : 'Original Invoice'}: ${invoice.originalInvoiceNumber}`,
          pageWidth - margin,
          y,
          { align: 'right' }
        );
        y += 6;
      }

      y += 5;

      // Line items table
      const tableHeaders = locale === 'ar'
        ? [['المبلغ', 'سعر الوحدة', 'الكمية', 'الوصف']]
        : [['Description', 'Qty', 'Unit Price', 'Amount']];

      const tableData = invoice.lineItems.map((item) => {
        if (locale === 'ar') {
          return [
            item.amount.toFixed(2),
            item.unitPrice.toFixed(2),
            String(item.quantity),
            item.descriptionAr,
          ];
        }
        return [
          item.descriptionEn,
          String(item.quantity),
          item.unitPrice.toFixed(2),
          item.amount.toFixed(2),
        ];
      });

      autoTable(doc, {
        head: tableHeaders,
        body: tableData,
        startY: y,
        theme: 'grid',
        styles: {
          font: 'Amiri',
          fontSize: 10,
          halign: locale === 'ar' ? 'right' : 'left',
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        margin: { left: margin, right: margin },
      });

      // Get the Y position after the table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable?.finalY ?? y + 40;
      y += 10;

      // Totals
      const totals = [
        [locale === 'ar' ? 'المجموع الفرعي' : 'Subtotal', invoice.subtotal.toFixed(2)],
        [`${locale === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT'} (${invoice.vatRate}%)`, invoice.vatAmount.toFixed(2)],
        [locale === 'ar' ? 'الإجمالي' : 'Total', invoice.total.toFixed(2)],
      ];

      if (invoice.paymentAmount && invoice.paymentAmount > 0) {
        totals.push([locale === 'ar' ? 'المدفوع' : 'Paid', invoice.paymentAmount.toFixed(2)]);
        totals.push([
          locale === 'ar' ? 'المتبقي' : 'Remaining',
          (invoice.total - invoice.paymentAmount).toFixed(2),
        ]);
      }

      totals.forEach(([label, value], index) => {
        const isBold = index === totals.length - 1 || label.includes('الإجمالي') || label.includes('Total');
        doc.setFontSize(isBold ? 12 : 10);
        doc.text(`${label}: ${value} ${locale === 'ar' ? 'ر.س' : 'SAR'}`, pageWidth - margin, y, {
          align: 'right',
        });
        y += 7;
      });

      y += 10;

      // ZATCA QR Code
      if (invoice.zatcaQrData) {
        try {
          const QRCode = await import('qrcode');
          const qrDataUrl = await QRCode.toDataURL(invoice.zatcaQrData, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 150,
          });
          const qrSize = 35;
          doc.addImage(qrDataUrl, 'PNG', margin, y, qrSize, qrSize);

          doc.setFontSize(8);
          doc.text(
            locale === 'ar' ? 'رمز QR الضريبي (ZATCA)' : 'ZATCA Tax QR Code',
            margin + qrSize + 5,
            y + qrSize / 2,
          );
        } catch {
          // QR generation failed, skip
        }
      }

      // Save PDF
      doc.save(`${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }, [invoice, company, locale, t]);

  return (
    <Button variant="outline" onClick={generatePdf} disabled={generating}>
      <Printer className="me-2 h-4 w-4" />
      {generating ? '...' : t('printPdf')}
    </Button>
  );
}
