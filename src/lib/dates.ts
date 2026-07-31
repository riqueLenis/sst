// Regras de data usadas nos cadastros (idade mínima, limites de campos etc.).

// Idade mínima permitida para cadastrar um colaborador (menor aprendiz a partir
// de 16 anos, conforme art. 7º, XXXIII da CF/88).
export const MIN_EMPLOYEE_AGE_YEARS = 16;

// Limite superior apenas para evitar datas absurdas digitadas por engano.
export const MAX_EMPLOYEE_AGE_YEARS = 100;

const toDateOnly = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

const toInputValue = (value: Date) => {
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${value.getFullYear()}-${month}-${day}`;
};

/** Converte "1990-05-10" (input date) em Date local, sem deslocamento de fuso. */
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

/**
 * Formata uma data vinda da API sem quebrar a tela quando o valor está ausente
 * ou inválido (o cadastro antigo pode não ter todos os campos preenchidos).
 */
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

/** Idem, incluindo horário (usado em comprovantes e assinaturas). */
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

/** Idade completa (em anos) na data de referência. */
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

/** Maior data de nascimento aceita (hoje - idade mínima), pronta para input[type=date]. */
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

/** Menor data de nascimento aceita (hoje - idade máxima), pronta para input[type=date]. */
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

/**
 * Valida a data de nascimento do colaborador.
 * Retorna a mensagem de erro ou null quando a data é aceita.
 */
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
