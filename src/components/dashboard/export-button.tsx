"use client";

import { Download } from "lucide-react";

interface ExportButtonProps {
  data: any[];
  filename: string;
  label?: string;
}

export function ExportButton({ data, filename, label = "Exportar CSV" }: ExportButtonProps) {
  const downloadCSV = () => {
    if (data.length === 0) return;

    // Use keys from first row as headers, or generic if no data
    const headers = Object.keys(data[0]).join(",");
    
    const rows = data.map((obj) => 
      Object.values(obj)
        .map((value) => {
          const stringValue = String(value ?? "");
          // Escape quotes and wrap in quotes
          return `"${stringValue.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    
    const csvContent = [headers, ...rows].join("\n");
    // Add BOM for Excel UTF-8 support
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={downloadCSV}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <Download className="h-4 w-4 text-zinc-400" />
      {label}
    </button>
  );
}
