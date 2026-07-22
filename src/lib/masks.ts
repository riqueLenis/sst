// Utilitários de formatação (máscaras) para campos numéricos.
// Cada função remove tudo que não for dígito, limita a quantidade máxima de
// dígitos ("não deixar ultrapassar") e aplica a formatação progressivamente
// conforme o usuário digita.

export const onlyDigits = (value: string): string => value.replace(/\D/g, "");

export const formatCPF = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length > 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  if (digits.length > 6) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  }
  return digits;
};

export const formatCNPJ = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 14);

  if (digits.length > 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  if (digits.length > 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  if (digits.length > 5) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length > 2) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }
  return digits;
};

export const formatDocument = (
  value: string,
  documentType: "CNPJ" | "CPF",
): string => (documentType === "CPF" ? formatCPF(value) : formatCNPJ(value));

export const formatCEP = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 8);

  if (digits.length > 5) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return digits;
};

export const formatPhone = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length === 0) {
    return "";
  }
  if (digits.length <= 2) {
    return `(${digits}`;
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

// Aplica a máscara de telefone a uma lista separada por vírgulas.
export const formatPhoneList = (value: string): string =>
  value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      return trimmed ? formatPhone(trimmed) : "";
    })
    .join(", ");
