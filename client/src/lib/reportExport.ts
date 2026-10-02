import jsPDF from "jspdf";
import * as XLSX from "xlsx";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportReportTable(
  format: "pdf" | "xlsx" | "csv",
  reportName: string,
  rows: Array<Record<string, string | number | undefined>>,
) {
  if (rows.length === 0) {
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  const headers = Object.keys(rows[0] ?? {});

  if (format === "csv") {
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    downloadBlob(new Blob([csvContent], { type: "text/csv;charset=utf-8;" }), `${reportName}.csv`);
    return;
  }

  if (format === "xlsx") {
    XLSX.utils.book_append_sheet(workbook, worksheet, reportName.slice(0, 31) || "report");
    XLSX.writeFile(workbook, `${reportName}.xlsx`);
    return;
  }

  const pdf = new jsPDF();
  pdf.setFontSize(14);
  pdf.text(reportName, 14, 14);
  pdf.setFontSize(10);

  let currentY = 28;
  rows.forEach((row) => {
    const line = headers.map((header) => `${header}: ${row[header] ?? ""}`).join(" | ");
    if (currentY > 280) {
      pdf.addPage();
      currentY = 18;
    }
    pdf.text(line, 14, currentY);
    currentY += 8;
  });

  pdf.save(`${reportName}.pdf`);
}
