'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ReportPdfProps {
  fileName: string;
  title: string;
  headers: string[];
  rows: string[][];
  footerRow?: string[];
  locale: string;
  summaryCards?: { label: string; value: string }[];
}

export function ReportPdfButton({
  fileName,
  title,
  headers,
  rows,
  footerRow,
  locale,
  summaryCards,
}: ReportPdfProps) {
  const tReports = useTranslations('reports');
  const [generating, setGenerating] = useState(false);

  const generate = useCallback(async () => {
    setGenerating(true);
    try {
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
          new Uint8Array(fontBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );
        doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.setFont('Amiri');
      } catch {
        doc.setFont('Helvetica');
      }

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = margin;

      // Title
      doc.setFontSize(16);
      doc.text(title, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Date
      doc.setFontSize(9);
      const dateStr = new Date().toLocaleDateString(
        locale === 'ar' ? 'ar-SA' : 'en-US',
        { year: 'numeric', month: 'long', day: 'numeric' }
      );
      doc.text(dateStr, pageWidth / 2, y, { align: 'center' });
      y += 8;

      // Summary cards
      if (summaryCards && summaryCards.length > 0) {
        doc.setFontSize(10);
        for (const card of summaryCards) {
          doc.text(`${card.label}: ${card.value}`, pageWidth - margin, y, {
            align: 'right',
          });
          y += 6;
        }
        y += 4;
      }

      // Table
      const tableBody = [...rows];
      if (footerRow) {
        tableBody.push(footerRow);
      }

      autoTable(doc, {
        head: [headers],
        body: tableBody,
        startY: y,
        theme: 'grid',
        styles: {
          font: 'Amiri',
          fontSize: 9,
          halign: locale === 'ar' ? 'right' : 'left',
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
        },
        didParseCell: (data) => {
          // Bold the last row if it's a footer
          if (footerRow && data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 240, 240];
          }
        },
        margin: { left: margin, right: margin },
      });

      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    } finally {
      setGenerating(false);
    }
  }, [fileName, title, headers, rows, footerRow, locale, summaryCards]);

  return (
    <Button variant="outline" size="sm" onClick={generate} disabled={generating}>
      <Download className="me-2 h-4 w-4" />
      {generating ? '...' : tReports('exportPdf')}
    </Button>
  );
}
