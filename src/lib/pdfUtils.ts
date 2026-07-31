import {
  createBrandedPdf,
  drawHighlights,
  drawIntro,
  buildTableOptions,
  savePdf,
  type Highlight,
} from "./pdfTheme";

export {
  createBrandedPdf,
  drawHighlights,
  drawInfoCards,
  drawIntro,
  drawNoteBox,
  drawSectionTitle,
  buildTableOptions,
  ensureSpace,
  getLastTableBottom,
  savePdf,
  formatPdfDate,
  formatPdfDateTime,
  PDF_COLORS,
} from "./pdfTheme";

export type ExportTableOptions = {
  /** Frase de apoio abaixo do título, explicando o conteúdo do relatório. */
  description?: string;
  /** Etiqueta curta no cabeçalho da marca. */
  tag?: string;
  /** Indicadores exibidos em cartões antes da tabela. */
  highlights?: Highlight[];
  orientation?: "portrait" | "landscape";
};

/**
 * Relatório tabular padrão do sistema: cabeçalho com a logo da EXIN, bloco de
 * introdução, indicadores opcionais, tabela estilizada e rodapé numerado.
 */
export const exportTableToPDF = (
  title: string,
  columns: string[],
  data: (string | number)[][],
  filename: string,
  options: ExportTableOptions = {},
) => {
  void (async () => {
    try {
      // Muitas colunas ficam apertadas em retrato: o relatório vira paisagem.
      const orientation =
        options.orientation ?? (columns.length > 6 ? "landscape" : "portrait");

      const ctx = await createBrandedPdf({
        title,
        tag: options.tag ?? "Relatório",
        orientation,
      });

      let cursorY = drawIntro(ctx, {
        eyebrow: options.tag ?? "Relatório operacional",
        heading: title,
        description: options.description,
      });

      const highlights: Highlight[] = options.highlights ?? [
        { label: "Registros", value: String(data.length) },
      ];

      cursorY = drawHighlights(ctx, cursorY, highlights);

      ctx.autoTable(
        ctx.doc,
        buildTableOptions(ctx, {
          startY: cursorY,
          head: [columns],
          body: data.map((row) => row.map((cell) => String(cell ?? "—"))),
        }),
      );

      savePdf(ctx, filename);
    } catch (error) {
      console.error("[EXIN SST] Falha ao gerar o PDF.", error);
      window.alert(
        "Não foi possível gerar o PDF agora. Tente novamente em instantes.",
      );
    }
  })();
};
