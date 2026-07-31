export const MIN_EMPLOYEE_AGE_YEARS = 16;
export const MAX_EMPLOYEE_AGE_YEARS = 100;

const toDateOnly = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const toInputValue = (value: Date) => {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${value.getFullYear()}-${month}-${day}`;
};
export const parseDateInput = (value: string): Date | null => {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsed = new Date(year, month - 1, day);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const toLocalDate = (value?: string | null): Date | null => {
  if (!value) {
    return null;
  }

  const dateOnly = parseDateInput(value);

  if (dateOnly) {
    return dateOnly;
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const isExpiredDate = (
  value?: string | null,
  referenceDate: Date = new Date(),
): boolean => {
  const parsed = toLocalDate(value);

  if (!parsed) {
    return false;
  }

  return toDateOnly(parsed).getTime() < toDateOnly(referenceDate).getTime();
};

export const isSameMonth = (
  value?: string | null,
  referenceDate: Date = new Date(),
): boolean => {
  const parsed = toLocalDate(value);

  if (!parsed) {
    return false;
  }

  return (
    parsed.getMonth() === referenceDate.getMonth() &&
    parsed.getFullYear() === referenceDate.getFullYear()
  );
};

export const getMonthKey = (value?: string | null): string | null => {
  const parsed = toLocalDate(value);

  if (!parsed) {
    return null;
  }

  return `${parsed.getFullYear()}-${`${parsed.getMonth() + 1}`.padStart(2, "0")}`;
};

export const formatDate = (value?: string | null, fallback = "—") => {
  if (!value) {
    return fallback;
  }

  const parsed = parseDateInput(value) ?? new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleDateString("pt-BR");
};

export const formatDateTime = (value?: string | null, fallback = "—") => {
  if (!value) {
    return fallback;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
};

export const calculateAge = (
  birthDate: string,
  referenceDate: Date = new Date(),
): number | null => {
  const birth = parseDateInput(birthDate);

  if (!birth) {
    return null;
  }

  const reference = toDateOnly(referenceDate);
  let age = reference.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    reference.getMonth() > birth.getMonth() ||
    (reference.getMonth() === birth.getMonth() &&
      reference.getDate() >= birth.getDate());

  if (!hasHadBirthdayThisYear) {
    age -= 1;
  }

  return age;
};

export const getMaxBirthDateInput = (referenceDate: Date = new Date()) => {
  const reference = toDateOnly(referenceDate);

  return toInputValue(
    new Date(
      reference.getFullYear() - MIN_EMPLOYEE_AGE_YEARS,
      reference.getMonth(),
      reference.getDate(),
    ),
  );
};

export const getMinBirthDateInput = (referenceDate: Date = new Date()) => {
  const reference = toDateOnly(referenceDate);

  return toInputValue(
    new Date(
      reference.getFullYear() - MAX_EMPLOYEE_AGE_YEARS,
      reference.getMonth(),
      reference.getDate(),
    ),
  );
};

export const validateBirthDate = (
  birthDate: string,
  referenceDate: Date = new Date(),
): string | null => {
  if (!birthDate) {
    return "Informe a data de nascimento.";
  }

  const birth = parseDateInput(birthDate);

  if (!birth) {
    return "Data de nascimento inválida.";
  }

  if (birth.getTime() > toDateOnly(referenceDate).getTime()) {
    return "A data de nascimento não pode ser uma data futura.";
  }

  const age = calculateAge(birthDate, referenceDate);

  if (age === null) {
    return "Data de nascimento inválida.";
  }

  if (age < MIN_EMPLOYEE_AGE_YEARS) {
    return `O colaborador precisa ter no mínimo ${MIN_EMPLOYEE_AGE_YEARS} anos. Idade informada: ${age} ano(s).`;
  }

  if (age > MAX_EMPLOYEE_AGE_YEARS) {
    return `Verifique a data de nascimento: idade informada de ${age} anos.`;
  }

  return null;
};
