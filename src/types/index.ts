export interface Company {
  id: string;
  name: string;
  cnpj: string;
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
  quantity: number;
  deliveryDate: string;
  returnDate?: string;
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

export interface ManagedUser extends AuthUser {
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}
