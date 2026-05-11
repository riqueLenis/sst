import { createPdfDocument } from "./pdfUtils";
import type { Company, Employee, PPE, PPEDelivery } from "../types";

export const formatPPEDeliverySignedAt = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

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

type GeneratePPEDeliveryPdfParams = {
  delivery: PPEDelivery;
  employee: Employee;
  ppe: PPE;
  company: Company;
};

const getDataUrlFormat = (value: string) =>
  value.startsWith("data:image/png") ? "PNG" : "JPEG";

export const generatePPEDeliveryPdf = async ({
  delivery,
  employee,
  ppe,
  company,
}: GeneratePPEDeliveryPdfParams) => {
  const { doc, autoTable } = await createPdfDocument();

  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text("Ficha de Entrega de EPI", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`Empresa: ${company.name}`, 14, 40);
  doc.text(`CNPJ: ${company.cnpj}`, 14, 48);

  doc.text(`Colaborador: ${employee.name}`, 14, 60);
  doc.text(`CPF: ${employee.cpf}`, 14, 68);
  doc.text(
    `Data de Admissão: ${new Date(employee.admissionDate).toLocaleDateString("pt-BR")}`,
    14,
    76,
  );

  autoTable(doc, {
    startY: 90,
    head: [["EPI", "CA", "Qtd", "Data Entrega", "Motivo"]],
    body: [
      [
        ppe.name,
        ppe.ca,
        delivery.quantity.toString(),
        new Date(delivery.deliveryDate).toLocaleDateString("pt-BR"),
        formatPPEDeliveryReason(delivery),
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
    },
    styles: { fontSize: 10, cellPadding: 5 },
  });

  const finalY =
    (doc as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ??
    120;
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  const declarationText = buildPPEDeliveryDeclarationText(company.name);

  const splitText = doc.splitTextToSize(declarationText, 180);
  doc.text(splitText, 14, finalY + 20);

  const pageHeight = doc.internal.pageSize.getHeight();
  let currentY = finalY + 44;
  doc.setDrawColor(203, 213, 225);

  const ensureSpace = (requiredHeight: number) => {
    if (currentY + requiredHeight <= pageHeight - 18) {
      return;
    }

    doc.addPage();
    currentY = 24;
  };

  if (delivery.employeeFacePhoto) {
    ensureSpace(92);
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Foto facial do colaborador", 105, currentY, {
      align: "center",
    });

    doc.setFillColor(248, 250, 252);
    doc.rect(62, currentY + 6, 86, 68, "F");
    doc.addImage(
      delivery.employeeFacePhoto,
      getDataUrlFormat(delivery.employeeFacePhoto),
      76,
      currentY + 10,
      58,
      58,
      undefined,
      "FAST",
    );

    if (delivery.facePhotoCapturedAt) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Capturada em ${formatPPEDeliverySignedAt(delivery.facePhotoCapturedAt)}`,
        105,
        currentY + 82,
        { align: "center" },
      );
    }

    currentY += 94;
  }

  if (delivery.employeeSignature) {
    ensureSpace(54);
    const signatureTop = currentY;
    doc.setFillColor(248, 250, 252);
    doc.rect(34, signatureTop - 16, 142, 34, "F");
    doc.addImage(
      delivery.employeeSignature,
      "PNG",
      40,
      signatureTop - 12,
      130,
      24,
      undefined,
      "FAST",
    );
    doc.line(40, signatureTop + 18, 170, signatureTop + 18);
    doc.setTextColor(15, 23, 42);
    doc.text("Assinatura digital do colaborador", 105, signatureTop + 26, {
      align: "center",
    });

    if (delivery.signedAt) {
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Capturada em ${formatPPEDeliverySignedAt(delivery.signedAt)}`,
        105,
        signatureTop + 32,
        { align: "center" },
      );
    }
  } else {
    ensureSpace(28);
    doc.line(40, currentY + 12, 170, currentY + 12);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `Assinatura do Colaborador: ${employee.name}`,
      105,
      currentY + 20,
      {
        align: "center",
      },
    );
  }

  doc.save(
    `Ficha_EPI_${employee.name.replace(/\s+/g, "_")}_${delivery.deliveryDate}.pdf`,
  );
};
