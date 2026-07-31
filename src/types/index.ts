export interface Company {
  id: string;
  documentType: "CNPJ" | "CPF";
  name: string;
  cnpj: string;
  razaoSocial: string;
  establishment: "matriz" | "filial";
  riskLevel: string;
  enableMapping: boolean;
  cnae: string;
  observations: string;
  tags: string[];
  hasContact: boolean;
  phone: string;
  otherPhones: string;
  email: string;
  cep: string;
  city: string;
  logradouro: string;
  addressNumber: string;
  neighborhood: string;
  complement: string;
  esocial: boolean;
  // Campos derivados mantidos para compatibilidade (listagem, PDF, etc.).
  address: string;
  contact: string;
}

export interface Sector {
  id: string;
  name: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  sectorId: string;
  description: string;
  requiredPpeIds?: string[];
}

export interface Employee {
  id: string;
  name: string;
  cpf: string;
  rg: string;
  birthDate: string;
  admissionDate: string;
  companyId: string;
  roleId: string;
  status: "active" | "inactive";
  // Preenchidos quando o colaborador é demitido/desligado.
  dismissalDate?: string;
  dismissalNotes?: string;
}

export interface PPE {
  id: string;
  name: string;
  ca: string;
  description: string;
  stockQuantity: number;
  unitCost?: number;
  minimumStock?: number;
  usefulLifeDays?: number;
}

export interface PPEDelivery {
  id: string;
  employeeId: string;
  ppeId: string;
  batchId?: string;
  quantity: number;
  deliveryDate: string;
  returnDate?: string;
  // Momento exato (ISO) e motivo informados no registro da devolução.
  returnedAt?: string;
  returnReason?: string;
  reason: string;
  replacementReason?: string;
  status: "delivered" | "returned" | "lost";
  employeeSignature?: string;
  signedAt?: string;
  employeeFacePhoto?: string;
  facePhotoCapturedAt?: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  dueDate: string;
  description: string;
  status: "pending" | "paid";
  category: string;
}

export interface SSTDocument {
  id: string;
  companyId: string;
  type: "PGR" | "PGR_NR18" | "LTCAT" | "OTHER";
  title: string;
  issueDate: string;
  validUntil: string;
  status: "active" | "expired" | "draft";
  hasInsalubrity: boolean;
  hasPericulosity: boolean;
  notes: string;
}

export interface ASO {
  id: string;
  employeeId: string;
  type: "admissional" | "demissional" | "periodico" | "retorno" | "mudanca";
  date: string;
  validUntil: string;
  result: "apto" | "inapto";
  doctor: string;
  crm: string;
  notes: string;
}

export interface Absence {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: "doenca" | "acidente_trabalho" | "maternidade" | "outros";
  cid: string;
  doctor: string;
  status: "active" | "finished";
}

export interface MedicalReferral {
  id: string;
  employeeId: string;
  date: string;
  specialty: string;
  reason: string;
  status: "pending" | "completed";
}

export type UserRole = "admin" | "manager" | "technician";

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthLoginResponse {
  user: AuthUser;
}

export interface ManagedUser extends AuthUser {
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
