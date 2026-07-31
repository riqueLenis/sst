import {
  PDF_COLORS,
  buildTableOptions,
  createBrandedPdf,
  drawInfoCards,
  drawIntro,
  drawNoteBox,
  drawSectionTitle,
  ensureSpace,
  formatPdfDate,
  formatPdfDateTime,
  getLastTableBottom,
  savePdf,
  type PdfContext,
} from "./pdfTheme";
import type { Company, Employee, PPE, PPEDelivery } from "../types";

export const formatPPEDeliverySignedAt = (value: string) =>
  formatPdfDateTime(value);

export const buildPPEDeliveryDeclarationText = (companyName: string) =>
  `Declaro ter recebido da empresa ${companyName} os Equipamentos de Proteção Individual (EPI) constantes nesta ficha, comprometendo-me a usá-los apenas para a finalidade a que se destinam, responsabilizando-me por sua guarda e conservação, e a comunicar qualquer alteração que os torne impróprios para uso.`;

export const formatPPEDeliveryReason = (
  delivery: Pick<PPEDelivery, "reason" | "replacementReason">,
) => {
  if (
    delivery.reason === "Substituição" &&
    delivery.replacementReason?.trim()
  ) {
    return `Substituição - ${delivery.replacementReason.trim()}`;
  }

  return delivery.reason;
};

type PPEDeliveryItem = {
  delivery: PPEDelivery;
  ppe: PPE;
};

type GeneratePPEDeliveryPdfParams = {
  // Um ou mais EPIs entregues em conjunto ao mesmo colaborador.
  items: PPEDeliveryItem[];
  employee: Employee;
  company: Company;
  /** Cargo do colaborador, quando disponível na tela que gera a ficha. */
  roleName?: string;
};

const getDataUrlFormat = (value: string) =>
  value.startsWith("data:image/png") ? "PNG" : "JPEG";

type ProofBox = {
  title: string;
  image?: string;
  caption?: string;
  placeholder?: string;
};

/** Caixa de comprovação (foto facial / assinatura digital). */
const drawProofBox = (
  ctx: PdfContext,
  box: ProofBox,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const { doc } = ctx;

  doc.setFillColor(...PDF_COLORS.surface);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, width, height, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.setTextColor(...PDF_COLORS.brand);
  doc.setCharSpace(0.4);
  doc.text(box.title.toUpperCase(), x + 5, y + 6.6);
  doc.setCharSpace(0);

  const frameTop = y + 10;
  const frameHeight = height - 20;
  const frameWidth = width - 10;

  doc.setFillColor(...PDF_COLORS.white);
  doc.setDrawColor(...PDF_COLORS.line);
  doc.roundedRect(x + 5, frameTop, frameWidth, frameHeight, 2.2, 2.2, "FD");

  const drawPlaceholder = (message: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_COLORS.mutedSoft);
    doc.text(message, x + width / 2, frameTop + frameHeight / 2, {
      align: "center",
    });
  };

  if (box.image) {
    const inset = 3;
    const availableWidth = frameWidth - inset * 2;
    const availableHeight = frameHeight - inset * 2;

    // Mantém a proporção original da foto/assinatura dentro da moldura.
    let drawWidth = availableWidth;
    let drawHeight = availableHeight;

    try {
      const properties = doc.getImageProperties(box.image);

      if (properties.width > 0 && properties.height > 0) {
        const ratio = properties.width / properties.height;
        drawHeight = Math.min(availableHeight, availableWidth / ratio);
        drawWidth = drawHeight * ratio;
      }
    } catch {
      // Sem as dimensões, usa a moldura inteira.
    }

    try {
      doc.addImage(
        box.image,
        getDataUrlFormat(box.image),
        x + 5 + inset + (availableWidth - drawWidth) / 2,
        frameTop + inset + (availableHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
        undefined,
        "FAST",
      );
    } catch (error) {
      // Uma imagem corrompida não pode impedir a emissão da ficha inteira.
      console.warn("[EXIN SST] Imagem não pôde ser embutida no PDF.", error);
      drawPlaceholder("Imagem indisponível");
    }
  } else {
    drawPlaceholder(box.placeholder ?? "Não capturado");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PDF_COLORS.mutedSoft);
  doc.text(box.caption ?? "", x + width / 2, y + height - 4.5, {
    align: "center",
  });
};

export const generatePPEDeliveryPdf = async ({
  items,
  employee,
  company,
  roleName,
}: GeneratePPEDeliveryPdfParams) => {
  if (items.length === 0) {
    return;
  }

  // Assinatura, foto e data são compartilhadas pelo lote (mesma entrega).
  const primaryDelivery = items[0].delivery;
  const protocol = (primaryDelivery.batchId ?? primaryDelivery.id).slice(0, 8);
  const totalItems = items.reduce(
    (total, item) => total + item.delivery.quantity,
    0,
  );

  const ctx = await createBrandedPdf({
    title: "Ficha de Entrega de EPI",
    tag: "Ficha de entrega",
    footerNote: `Ficha de entrega de EPI · Protocolo ${protocol.toUpperCase()} · ${employee.name}`,
  });

  let cursorY = drawIntro(ctx, {
    eyebrow: "Controle de EPI · NR-06",
    heading: "Ficha de Entrega de Equipamento de Proteção Individual",
    description:
      "Registro de entrega assinado digitalmente pelo colaborador, com foto facial de conferência, conforme a NR-06 (Portaria 3.214/78) e as políticas internas de segurança do trabalho.",
  });

  cursorY = drawInfoCards(ctx, cursorY, [
    {
      title: "Empresa",
      fields: [
        { label: "Razão social / Nome", value: company.name },
        { label: "CNPJ / CPF", value: company.cnpj },
      ],
    },
    {
      title: "Colaborador",
      fields: [
        { label: "Nome", value: employee.name },
        { label: "CPF", value: employee.cpf },
        { label: "Cargo", value: roleName ?? "Não informado" },
        {
          label: "Admissão",
          value: formatPdfDate(employee.admissionDate),
        },
      ],
    },
  ]);

  cursorY = drawSectionTitle(
    ctx,
    cursorY + 2,
    "Equipamentos entregues",
    `${items.length} item(ns) · ${totalItems} unidade(s) · Entrega em ${formatPdfDate(primaryDelivery.deliveryDate)}`,
  );

  ctx.autoTable(
    ctx.doc,
    buildTableOptions(ctx, {
      startY: cursorY + 4,
      head: [["EPI", "CA", "Qtd", "Data da entrega", "Motivo"]],
      body: items.map(({ delivery, ppe }) => [
        ppe.name,
        ppe.ca,
        delivery.quantity.toString(),
        formatPdfDate(delivery.deliveryDate),
        formatPPEDeliveryReason(delivery),
      ]),
      columnStyles: {
        1: { halign: "center", cellWidth: 22 },
        2: { halign: "center", cellWidth: 14 },
        3: { halign: "center", cellWidth: 30 },
      },
    }),
  );

  cursorY = getLastTableBottom(ctx, cursorY) + 8;

  cursorY = ensureSpace(ctx, cursorY, 34);
  cursorY = drawNoteBox(ctx, cursorY, {
    title: "Termo de responsabilidade",
    text: buildPPEDeliveryDeclarationText(company.name),
  });

  // Comprovações lado a lado (foto facial e assinatura digital).
  const boxHeight = 58;
  cursorY = ensureSpace(ctx, cursorY, boxHeight + 6);

  const gap = 5;
  const boxWidth = (ctx.contentWidth - gap) / 2;

  drawProofBox(
    ctx,
    {
      title: "Foto facial do colaborador",
      image: primaryDelivery.employeeFacePhoto,
      caption: primaryDelivery.facePhotoCapturedAt
        ? `Capturada em ${formatPdfDateTime(primaryDelivery.facePhotoCapturedAt)}`
        : "Foto não capturada",
      placeholder: "Sem foto registrada",
    },
    ctx.margin,
    cursorY,
    boxWidth,
    boxHeight,
  );

  drawProofBox(
    ctx,
    {
      title: "Assinatura digital",
      image: primaryDelivery.employeeSignature,
      caption: primaryDelivery.signedAt
        ? `Assinado em ${formatPdfDateTime(primaryDelivery.signedAt)}`
        : `Assinatura de ${employee.name}`,
      placeholder: "Assinar no ato da entrega",
    },
    ctx.margin + boxWidth + gap,
    cursorY,
    boxWidth,
    boxHeight,
  );

  cursorY += boxHeight + 8;

  // Linha de conferência do responsável pela entrega.
  cursorY = ensureSpace(ctx, cursorY, 20);
  const signatureWidth = 74;
  const signatureX = ctx.pageWidth - ctx.margin - signatureWidth;

  ctx.doc.setDrawColor(...PDF_COLORS.mutedSoft);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(ctx.margin, cursorY, ctx.margin + signatureWidth, cursorY);
  ctx.doc.line(signatureX, cursorY, signatureX + signatureWidth, cursorY);

  ctx.doc.setFont("helvetica", "normal");
  ctx.doc.setFontSize(7.6);
  ctx.doc.setTextColor(...PDF_COLORS.muted);
  ctx.doc.text(
    "Responsável pela entrega (nome e assinatura)",
    ctx.margin,
    cursorY + 4.5,
  );
  ctx.doc.text(
    "Responsável técnico em segurança do trabalho",
    signatureX,
    cursorY + 4.5,
  );

  savePdf(
    ctx,
    `Ficha_EPI_${employee.name.replace(/\s+/g, "_")}_${primaryDelivery.deliveryDate}.pdf`,
  );
};
