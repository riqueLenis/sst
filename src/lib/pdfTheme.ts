import type { jsPDF } from "jspdf";
import type { UserOptions } from "jspdf-autotable";
import { brand } from "./brand";
import { formatDate, formatDateTime } from "./dates";

/**
 * Identidade visual compartilhada por todos os PDFs do sistema (relatórios,
 * fichas de entrega e históricos): cabeçalho com a logo da EXIN, tipografia,
 * paleta, tabelas e rodapé numerado.
 */

type RGB = [number, number, number];

export const PDF_COLORS: Record<string, RGB> = {
  navy: [22, 62, 112],
  navyDeep: [12, 31, 59],
  brand: [44, 184, 151],
  brandSoft: [168, 232, 219],
  text: [18, 40, 76],
  muted: [70, 101, 122],
  mutedSoft: [116, 141, 158],
  line: [214, 227, 233],
  surface: [244, 250, 249],
  surfaceStrong: [235, 245, 244],
  white: [255, 255, 255],
  danger: [185, 28, 28],
};

type BrandLogo = {
  dataUrl: string;
  ratio: number;
};

let brandLogoPromise: Promise<BrandLogo | null> | null = null;

const loadImageElement = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Falha ao carregar a logo da EXIN."));
    image.src = src;
  });

/**
 * Converte a logo do bundle em data URL (formato aceito pelo jsPDF).
 * O resultado é memoizado: a logo é carregada uma única vez por sessão.
 * Se algo falhar, o PDF continua sendo gerado — apenas sem a imagem.
 */
export const loadBrandLogo = (): Promise<BrandLogo | null> => {
  if (!brandLogoPromise) {
    brandLogoPromise = (async () => {
      try {
        const image = await loadImageElement(brand.logoSrc);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");

        if (!context || !canvas.width || !canvas.height) {
          return null;
        }

        context.drawImage(image, 0, 0);

        return {
          dataUrl: canvas.toDataURL("image/png"),
          ratio: canvas.width / canvas.height,
        };
      } catch (error) {
        console.warn("[EXIN SST] Logo indisponível para o PDF.", error);
        return null;
      }
    })();
  }

  return brandLogoPromise;
};

const loadPdfTools = async () => {
  const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  return { JsPDF, autoTable };
};

export type PdfContext = {
  doc: jsPDF;
  autoTable: (doc: jsPDF, options: UserOptions) => void;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  contentWidth: number;
  contentTop: number;
  headerHeight: number;
  footerHeight: number;
  generatedAt: Date;
  title: string;
  tag: string;
  logo: BrandLogo | null;
  footerNote?: string;
  decoratedPages: Set<number>;
};

type CreatePdfParams = {
  /** Título do documento, exibido no cabeçalho de todas as páginas. */
  title: string;
  /** Etiqueta curta acima do título (ex.: "Relatório", "Ficha de entrega"). */
  tag?: string;
  orientation?: "portrait" | "landscape";
  /** Texto extra no rodapé (protocolo, referência do registro etc.). */
  footerNote?: string;
};

export const formatPdfDate = (value?: string | Date | null) => {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    // Datas "YYYY-MM-DD" precisam ser lidas como data local: new Date(string)
    // as interpreta em UTC e imprimiria o dia anterior no fuso do Brasil.
    return formatDate(value);
  }

  return Number.isNaN(value.getTime())
    ? "—"
    : value.toLocaleDateString("pt-BR");
};

export const formatPdfDateTime = (value?: string | Date | null) => {
  if (!value) {
    return "—";
  }

  if (typeof value === "string") {
    return formatDateTime(value);
  }

  return Number.isNaN(value.getTime())
    ? "—"
    : value.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      });
};

/** Cria o documento já com fontes, metadados e a logo carregada. */
export const createBrandedPdf = async ({
  title,
  tag = "Documento",
  orientation = "portrait",
  footerNote,
}: CreatePdfParams): Promise<PdfContext> => {
  const [{ JsPDF, autoTable }, logo] = await Promise.all([
    loadPdfTools(),
    loadBrandLogo(),
  ]);

  const doc = new JsPDF({ orientation, unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  doc.setProperties({
    title: `${title} | ${brand.platformName}`,
    subject: title,
    author: brand.fullName,
    creator: brand.platformName,
  });

  return {
    doc,
    autoTable,
    pageWidth,
    pageHeight,
    margin,
    contentWidth: pageWidth - margin * 2,
    headerHeight: 26,
    footerHeight: 16,
    contentTop: 36,
    generatedAt: new Date(),
    title,
    tag,
    logo,
    footerNote,
    decoratedPages: new Set<number>(),
  };
};

const setFill = (doc: jsPDF, color: RGB) => doc.setFillColor(...color);
const setText = (doc: jsPDF, color: RGB) => doc.setTextColor(...color);
const setDraw = (doc: jsPDF, color: RGB) => doc.setDrawColor(...color);

/** Cabeçalho da marca: faixa azul, logo em cartão branco e dados do documento. */
export const drawPageHeader = (ctx: PdfContext) => {
  const { doc, pageWidth, margin, headerHeight } = ctx;
  const pageNumber = doc.getCurrentPageInfo().pageNumber;

  if (ctx.decoratedPages.has(pageNumber)) {
    return;
  }

  ctx.decoratedPages.add(pageNumber);

  setFill(doc, PDF_COLORS.navy);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Bloco degradê simplificado: retângulo mais escuro à esquerda.
  setFill(doc, PDF_COLORS.navyDeep);
  doc.rect(0, 0, pageWidth * 0.42, headerHeight, "F");

  setFill(doc, PDF_COLORS.brand);
  doc.rect(0, headerHeight, pageWidth, 1.4, "F");

  const cardWidth = 18;
  const cardHeight = 15;
  const cardX = margin;
  const cardY = (headerHeight - cardHeight) / 2;

  setFill(doc, PDF_COLORS.white);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2.6, 2.6, "F");

  let logoDrawn = false;

  if (ctx.logo) {
    const innerHeight = cardHeight - 4;
    const innerWidth = cardWidth - 4;
    const drawHeight = Math.min(innerHeight, innerWidth / ctx.logo.ratio);
    const drawWidth = drawHeight * ctx.logo.ratio;

    try {
      doc.addImage(
        ctx.logo.dataUrl,
        "PNG",
        cardX + (cardWidth - drawWidth) / 2,
        cardY + (cardHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
        // Alias fixo: a logo é embutida uma única vez e reutilizada em todas
        // as páginas, mantendo o arquivo leve.
        "exin-logo",
        "FAST",
      );
      logoDrawn = true;
    } catch (error) {
      console.warn("[EXIN SST] Não foi possível desenhar a logo no PDF.", error);
    }
  }

  if (!logoDrawn) {
    setText(doc, PDF_COLORS.navy);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(brand.name, cardX + cardWidth / 2, cardY + cardHeight / 2 + 1.6, {
      align: "center",
    });
  }

  const textX = cardX + cardWidth + 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  setText(doc, PDF_COLORS.white);
  doc.text(brand.name, textX, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.6);
  setText(doc, PDF_COLORS.brandSoft);
  doc.text("Saúde e Segurança do Trabalho", textX, 17);

  const rightX = pageWidth - margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  setText(doc, PDF_COLORS.brandSoft);
  doc.setCharSpace(0.5);
  doc.text(ctx.tag.toUpperCase(), rightX, 9.5, { align: "right" });
  doc.setCharSpace(0);

  doc.setFontSize(10.5);
  setText(doc, PDF_COLORS.white);
  doc.text(
    doc.splitTextToSize(ctx.title, pageWidth * 0.5)[0] ?? ctx.title,
    rightX,
    15.5,
    { align: "right" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.2);
  setText(doc, PDF_COLORS.brandSoft);
  doc.text(
    `Emitido em ${formatPdfDateTime(ctx.generatedAt)}`,
    rightX,
    20.5,
    { align: "right" },
  );
};

/** Rodapé com linha, assinatura institucional e numeração de páginas. */
const drawPageFooter = (ctx: PdfContext, pageNumber: number, total: number) => {
  const { doc, pageWidth, pageHeight, margin } = ctx;
  const baseline = pageHeight - 10;

  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.line(margin, baseline - 4.5, pageWidth - margin, baseline - 4.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setText(doc, PDF_COLORS.mutedSoft);
  doc.text(
    ctx.footerNote
      ? `${brand.descriptiveName} · ${ctx.footerNote}`
      : `${brand.descriptiveName} · Documento gerado automaticamente pelo sistema ${brand.platformName}.`,
    margin,
    baseline,
  );

  doc.setFont("helvetica", "bold");
  setText(doc, PDF_COLORS.muted);
  doc.text(`Página ${pageNumber} de ${total}`, pageWidth - margin, baseline, {
    align: "right",
  });
};

/** Fecha o documento: garante cabeçalho/rodapé em todas as páginas e salva. */
export const savePdf = (ctx: PdfContext, filename: string) => {
  const { doc } = ctx;
  const total = doc.getNumberOfPages();

  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    drawPageHeader(ctx);
    drawPageFooter(ctx, page, total);
  }

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
};

type IntroParams = {
  eyebrow?: string;
  heading: string;
  description?: string;
};

/** Bloco de abertura da primeira página (etiqueta + título + descrição). */
export const drawIntro = (ctx: PdfContext, params: IntroParams) => {
  const { doc, margin, contentWidth } = ctx;
  let cursorY = ctx.contentTop + 2;

  if (params.eyebrow) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    setText(doc, PDF_COLORS.brand);
    doc.setCharSpace(0.55);
    doc.text(params.eyebrow.toUpperCase(), margin, cursorY);
    doc.setCharSpace(0);
    cursorY += 5.5;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  setText(doc, PDF_COLORS.navy);
  const headingLines = doc.splitTextToSize(params.heading, contentWidth);
  doc.text(headingLines, margin, cursorY);
  cursorY += headingLines.length * 6.6;

  if (params.description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.2);
    setText(doc, PDF_COLORS.muted);
    const descriptionLines = doc.splitTextToSize(
      params.description,
      contentWidth,
    );
    doc.text(descriptionLines, margin, cursorY + 1);
    cursorY += descriptionLines.length * 4.6 + 1;
  }

  return cursorY + 3;
};

export type Highlight = {
  label: string;
  value: string;
};

/** Cartões de destaque (indicadores rápidos) em linha. */
export const drawHighlights = (
  ctx: PdfContext,
  startY: number,
  highlights: Highlight[],
) => {
  if (highlights.length === 0) {
    return startY;
  }

  const { doc, margin, contentWidth } = ctx;
  const perRow = Math.min(highlights.length, 4);
  const gap = 4;
  const cardWidth = (contentWidth - gap * (perRow - 1)) / perRow;
  const cardHeight = 16;
  let cursorY = startY;

  highlights.forEach((highlight, index) => {
    const column = index % perRow;

    if (column === 0 && index > 0) {
      cursorY += cardHeight + gap;
    }

    const x = margin + column * (cardWidth + gap);

    setFill(doc, PDF_COLORS.surface);
    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cursorY, cardWidth, cardHeight, 2.4, 2.4, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    setText(doc, PDF_COLORS.mutedSoft);
    doc.setCharSpace(0.35);
    doc.text(
      doc.splitTextToSize(highlight.label.toUpperCase(), cardWidth - 6)[0] ?? "",
      x + 3,
      cursorY + 5.6,
    );
    doc.setCharSpace(0);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    setText(doc, PDF_COLORS.navy);
    doc.text(
      doc.splitTextToSize(highlight.value, cardWidth - 6)[0] ?? "",
      x + 3,
      cursorY + 12,
    );
  });

  return cursorY + cardHeight + 6;
};

export type InfoField = {
  label: string;
  value: string;
};

export type InfoCard = {
  title: string;
  fields: InfoField[];
};

/** Cartões de dados (ex.: Empresa | Colaborador) lado a lado. */
export const drawInfoCards = (
  ctx: PdfContext,
  startY: number,
  cards: InfoCard[],
) => {
  if (cards.length === 0) {
    return startY;
  }

  const { doc, margin, contentWidth } = ctx;
  const gap = 5;
  const cardWidth = (contentWidth - gap * (cards.length - 1)) / cards.length;
  const rows = Math.max(...cards.map((card) => card.fields.length));
  const cardHeight = 13 + rows * 8;

  cards.forEach((card, index) => {
    const x = margin + index * (cardWidth + gap);

    setFill(doc, PDF_COLORS.surface);
    setDraw(doc, PDF_COLORS.line);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 3, 3, "FD");

    setFill(doc, PDF_COLORS.brand);
    doc.roundedRect(x, startY, 1.6, cardHeight, 0.8, 0.8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    setText(doc, PDF_COLORS.brand);
    doc.setCharSpace(0.4);
    doc.text(card.title.toUpperCase(), x + 5, startY + 6.4);
    doc.setCharSpace(0);

    card.fields.forEach((field, fieldIndex) => {
      const fieldY = startY + 13 + fieldIndex * 8;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setText(doc, PDF_COLORS.mutedSoft);
      doc.text(field.label, x + 5, fieldY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setText(doc, PDF_COLORS.text);
      doc.text(
        doc.splitTextToSize(field.value || "—", cardWidth - 9)[0] ?? "—",
        x + 5,
        fieldY + 4.4,
      );
    });
  });

  return startY + cardHeight + 6;
};

/** Caixa de texto destacada (declaração, termo, observações). */
export const drawNoteBox = (
  ctx: PdfContext,
  startY: number,
  params: { title?: string; text: string; accent?: RGB },
) => {
  const { doc, margin, contentWidth } = ctx;
  const accent = params.accent ?? PDF_COLORS.navy;
  const innerWidth = contentWidth - 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  const lines = doc.splitTextToSize(params.text, innerWidth);
  const boxHeight = (params.title ? 12 : 6) + lines.length * 4.4 + 5;

  setFill(doc, PDF_COLORS.surfaceStrong);
  setDraw(doc, PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, startY, contentWidth, boxHeight, 3, 3, "FD");

  setFill(doc, accent);
  doc.roundedRect(margin, startY, 1.6, boxHeight, 0.8, 0.8, "F");

  let textY = startY + 7;

  if (params.title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    setText(doc, accent);
    doc.setCharSpace(0.4);
    doc.text(params.title.toUpperCase(), margin + 6, textY);
    doc.setCharSpace(0);
    textY += 6;
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.6);
  setText(doc, PDF_COLORS.muted);
  doc.text(lines, margin + 6, textY);

  return startY + boxHeight + 6;
};

/** Título de seção com filete colorido. */
export const drawSectionTitle = (
  ctx: PdfContext,
  startY: number,
  title: string,
  description?: string,
) => {
  const { doc, margin, contentWidth } = ctx;

  setFill(doc, PDF_COLORS.brand);
  doc.roundedRect(margin, startY - 3.6, 2.4, 5, 1.2, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  setText(doc, PDF_COLORS.navy);
  doc.text(title, margin + 5, startY);

  if (description) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(doc, PDF_COLORS.mutedSoft);
    const lines = doc.splitTextToSize(description, contentWidth - 5);
    doc.text(lines, margin + 5, startY + 4.4);

    return startY + 4.4 + lines.length * 4;
  }

  return startY + 4;
};

/** Estilos padrão das tabelas + repetição do cabeçalho a cada nova página. */
export const buildTableOptions = (
  ctx: PdfContext,
  options: UserOptions,
): UserOptions => ({
  theme: "grid",
  styles: {
    font: "helvetica",
    fontSize: 8.4,
    cellPadding: { top: 2.6, right: 2.6, bottom: 2.6, left: 2.6 },
    lineColor: PDF_COLORS.line,
    lineWidth: 0.1,
    textColor: PDF_COLORS.text,
    overflow: "linebreak",
    valign: "middle",
  },
  headStyles: {
    fillColor: PDF_COLORS.navy,
    textColor: PDF_COLORS.white,
    fontStyle: "bold",
    fontSize: 8.4,
    cellPadding: { top: 3.2, right: 2.6, bottom: 3.2, left: 2.6 },
    lineColor: PDF_COLORS.navy,
    lineWidth: 0.1,
  },
  alternateRowStyles: {
    fillColor: PDF_COLORS.surface,
  },
  tableLineColor: PDF_COLORS.line,
  tableLineWidth: 0.1,
  margin: {
    top: ctx.contentTop,
    right: ctx.margin,
    bottom: ctx.footerHeight + 6,
    left: ctx.margin,
  },
  ...options,
  // O cabeçalho da marca precisa ser redesenhado sempre que a tabela quebra
  // para uma nova página.
  didDrawPage: (data) => {
    drawPageHeader(ctx);
    options.didDrawPage?.(data);
  },
});

/** Posição final da última tabela desenhada. */
export const getLastTableBottom = (ctx: PdfContext, fallback: number) =>
  (ctx.doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable
    ?.finalY ?? fallback;

/** Garante espaço na página atual; cria uma nova quando necessário. */
export const ensureSpace = (
  ctx: PdfContext,
  currentY: number,
  requiredHeight: number,
) => {
  const limit = ctx.pageHeight - ctx.footerHeight - 4;

  if (currentY + requiredHeight <= limit) {
    return currentY;
  }

  ctx.doc.addPage();
  drawPageHeader(ctx);

  return ctx.contentTop;
};
