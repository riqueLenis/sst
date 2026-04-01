const loadPdfTools = async () => {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  return { JsPDF, autoTable };
};

export const createPdfDocument = async () => {
  const { JsPDF, autoTable } = await loadPdfTools();

  return {
    doc: new JsPDF(),
    autoTable,
  };
};

export const exportTableToPDF = (
  title: string,
  columns: string[],
  data: any[][],
  filename: string,
) => {
  void (async () => {
    const { doc, autoTable } = await createPdfDocument();

    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Relatório gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`,
      14,
      28,
    );

    autoTable(doc, {
      startY: 35,
      head: [columns],
      body: data,
      theme: "grid",
      headStyles: {
        fillColor: [37, 99, 235],
        textColor: 255,
        fontStyle: "bold",
      },
      styles: { fontSize: 9, cellPadding: 4, textColor: [51, 65, 85] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { top: 35 },
    });

    doc.save(`${filename}.pdf`);
  })();
};
