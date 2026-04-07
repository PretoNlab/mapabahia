"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

interface ExportRow {
  [key: string]: string | number | null;
}

export function exportToExcel(
  rows: ExportRow[],
  filename: string,
  sheetName = "Dados"
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  filename: string
) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.setTextColor(37, 99, 235); // blue-600
  doc.text("Pulso Bahia", 14, 20);

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 14, 30);

  doc.setFontSize(10);
  doc.setTextColor(113, 113, 122); // zinc-500
  doc.text(subtitle, 14, 37);

  doc.setTextColor(0, 0, 0);

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 44,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(161, 161, 170);
    doc.text(
      `Pulso Bahia — Gerado em ${new Date().toLocaleDateString("pt-BR")} — Pagina ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`${filename}.pdf`);
}
