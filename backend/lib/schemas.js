import { z } from "zod";

const trimmedString = (label, max = 255) =>
  z
    .string({ required_error: `${label} é obrigatório.` })
    .trim()
    .min(1, `${label} é obrigatório.`)
    .max(max, `${label} deve ter no máximo ${max} caracteres.`);

const dateString = (label) =>
  trimmedString(label, 40).refine(
    (value) => !Number.isNaN(Date.parse(value)),
    `${label} deve ser uma data válida.`,
  );

const optionalDateString = (label) =>
  z
    .union([dateString(label), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined));

const numericField = (label, schema) =>
  z.preprocess(
    (value) => {
      if (typeof value === "string" && value.trim() !== "") {
        return Number(value);
      }

      return value;
    },
    schema.refine(
      (value) => Number.isFinite(value),
      `${label} deve ser numérico.`,
    ),
  );

const positiveInteger = (label) =>
  numericField(
    label,
    z
      .number({ invalid_type_error: `${label} deve ser numérico.` })
      .int(`${label} deve ser um número inteiro.`)
      .positive(`${label} deve ser maior que zero.`),
  );

const nonNegativeInteger = (label) =>
  numericField(
    label,
    z
      .number({ invalid_type_error: `${label} deve ser numérico.` })
      .int(`${label} deve ser um número inteiro.`)
      .min(0, `${label} não pode ser negativo.`),
  );

const positiveNumber = (label) =>
  numericField(
    label,
    z
      .number({ invalid_type_error: `${label} deve ser numérico.` })
      .positive(`${label} deve ser maior que zero.`),
  );

const booleanField = (label) =>
  z.preprocess(
    (value) => {
      if (value === "true") {
        return true;
      }

      if (value === "false") {
        return false;
      }

      return value;
    },
    z.boolean({ invalid_type_error: `${label} deve ser booleano.` }),
  );

const enumField = (values, label) =>
  trimmedString(label, 50).refine(
    (value) => values.includes(value),
    `${label} inválido. Valores aceitos: ${values.join(", ")}.`,
  );

const imageDataUrl = (label) =>
  trimmedString(label, 12_000_000).refine(
    (value) => value.startsWith("data:image/"),
    `${label} precisa ser uma imagem em data URL.`,
  );

const passwordString = trimmedString("Senha", 120).min(
  6,
  "Senha deve ter no mínimo 6 caracteres.",
);

const patchSchema = (schema) => schema.partial().strict();

const companySchema = z
  .object({
    name: trimmedString("Nome da empresa", 180),
    cnpj: trimmedString("CNPJ", 30),
    address: trimmedString("Endereço", 255),
    contact: trimmedString("Contato", 180),
  })
  .strict();

const sectorSchema = z
  .object({
    name: trimmedString("Nome do setor", 120),
    description: trimmedString("Descrição", 400),
  })
  .strict();

const roleSchema = z
  .object({
    name: trimmedString("Nome do cargo", 120),
    sectorId: trimmedString("Setor", 80),
    description: trimmedString("Descrição", 400),
  })
  .strict();

const employeeSchema = z
  .object({
    name: trimmedString("Nome do colaborador", 180),
    cpf: trimmedString("CPF", 20),
    rg: trimmedString("RG", 30),
    birthDate: dateString("Data de nascimento"),
    admissionDate: dateString("Data de admissão"),
    companyId: trimmedString("Empresa", 80),
    roleId: trimmedString("Cargo", 80),
    status: enumField(["active", "inactive"], "Status do colaborador"),
  })
  .strict();

const ppeSchema = z
  .object({
    name: trimmedString("Nome do EPI", 180),
    ca: trimmedString("CA", 30),
    description: trimmedString("Descrição", 400),
    stockQuantity: nonNegativeInteger("Quantidade em estoque"),
  })
  .strict();

const ppeDeliverySchema = z
  .object({
    employeeId: trimmedString("Colaborador", 80),
    ppeId: trimmedString("EPI", 80),
    quantity: positiveInteger("Quantidade"),
    deliveryDate: dateString("Data da entrega"),
    returnDate: optionalDateString("Data de devolução"),
    reason: trimmedString("Motivo", 240),
    status: enumField(
      ["delivered", "returned", "lost"],
      "Status da entrega",
    ).default("delivered"),
    employeeSignature: imageDataUrl("Assinatura do colaborador"),
    signedAt: optionalDateString("Data da assinatura"),
    employeeFacePhoto: imageDataUrl("Foto facial do colaborador"),
    facePhotoCapturedAt: optionalDateString("Data da captura facial"),
  })
  .strict();

const transactionSchema = z
  .object({
    companyId: trimmedString("Empresa", 80),
    type: enumField(["income", "expense"], "Tipo da transação"),
    amount: positiveNumber("Valor"),
    date: dateString("Data de emissão"),
    dueDate: dateString("Data de vencimento"),
    description: trimmedString("Descrição", 240),
    status: enumField(["pending", "paid"], "Status da transação"),
    category: trimmedString("Categoria", 120),
  })
  .strict();

const documentSchema = z
  .object({
    companyId: trimmedString("Empresa", 80),
    type: enumField(["PGR", "PGR_NR18", "LTCAT", "OTHER"], "Tipo de documento"),
    title: trimmedString("Título", 180),
    issueDate: dateString("Data de emissão"),
    validUntil: dateString("Validade"),
    status: enumField(["active", "expired", "draft"], "Status do documento"),
    hasInsalubrity: booleanField("Flag de insalubridade"),
    hasPericulosity: booleanField("Flag de periculosidade"),
    notes: z.string().trim().max(2000, "Observações muito longas.").default(""),
  })
  .strict();

const asoSchema = z
  .object({
    employeeId: trimmedString("Colaborador", 80),
    type: enumField(
      ["admissional", "demissional", "periodico", "retorno", "mudanca"],
      "Tipo de ASO",
    ),
    date: dateString("Data do ASO"),
    validUntil: dateString("Validade do ASO"),
    result: enumField(["apto", "inapto"], "Resultado do ASO"),
    doctor: trimmedString("Médico responsável", 180),
    crm: trimmedString("CRM", 40),
    notes: z.string().trim().max(2000, "Observações muito longas.").default(""),
  })
  .strict();

const absenceSchema = z
  .object({
    employeeId: trimmedString("Colaborador", 80),
    startDate: dateString("Data inicial"),
    endDate: dateString("Data final"),
    reason: enumField(
      ["doenca", "acidente_trabalho", "maternidade", "outros"],
      "Motivo do afastamento",
    ),
    cid: trimmedString("CID", 40),
    doctor: trimmedString("Médico", 180),
    status: enumField(["active", "finished"], "Status do afastamento"),
  })
  .strict();

const referralSchema = z
  .object({
    employeeId: trimmedString("Colaborador", 80),
    date: dateString("Data do encaminhamento"),
    specialty: trimmedString("Especialidade", 120),
    reason: trimmedString("Motivo", 400),
    status: enumField(["pending", "completed"], "Status do encaminhamento"),
  })
  .strict();

export const resourceSchemas = {
  companies: {
    create: companySchema,
    update: patchSchema(companySchema),
  },
  sectors: {
    create: sectorSchema,
    update: patchSchema(sectorSchema),
  },
  roles: {
    create: roleSchema,
    update: patchSchema(roleSchema),
  },
  employees: {
    create: employeeSchema,
    update: patchSchema(employeeSchema),
  },
  ppes: {
    create: ppeSchema,
    update: patchSchema(ppeSchema),
  },
  ppeDeliveries: {
    create: ppeDeliverySchema,
    update: patchSchema(ppeDeliverySchema),
  },
  transactions: {
    create: transactionSchema,
    update: patchSchema(transactionSchema),
  },
  documents: {
    create: documentSchema,
    update: patchSchema(documentSchema),
  },
  asos: {
    create: asoSchema,
    update: patchSchema(asoSchema),
  },
  absences: {
    create: absenceSchema,
    update: patchSchema(absenceSchema),
  },
  referrals: {
    create: referralSchema,
    update: patchSchema(referralSchema),
  },
};

export const authSchemas = {
  login: z
    .object({
      username: trimmedString("Usuário", 80),
      password: passwordString,
    })
    .strict(),
};
