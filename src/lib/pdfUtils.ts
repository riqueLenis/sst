import jsPDF from "jspdf";
import "jspdf-autotable";

export const exportTableToPDF = (
  title: string,
  columns: string[],
  data: any[][],
  filename: string,
) => {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 20);

  // Subtítulo / Data
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(
    `Relatório gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
    14,
    28,
  );

  // Tabela
  (doc as any).autoTable({
    startY: 35,
    head: [columns],
    body: data,
    theme: "grid",
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" }, // blue-600
    styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
    alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
    margin: { top: 35 },
  });

  doc.save(`${filename}.pdf`);
};
