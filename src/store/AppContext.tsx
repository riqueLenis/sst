import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  Company,
  Sector,
  Role,
  Employee,
  PPE,
  PPEDelivery,
  Transaction,
  SSTDocument,
  ASO,
  Absence,
  MedicalReferral,
} from "../types";

interface AppState {
  companies: Company[];
  sectors: Sector[];
  roles: Role[];
  employees: Employee[];
  ppes: PPE[];
  ppeDeliveries: PPEDelivery[];
  transactions: Transaction[];
  documents: SSTDocument[];
  asos: ASO[];
  absences: Absence[];
  referrals: MedicalReferral[];
}

interface AppContextType extends AppState {
  addCompany: (company: Omit<Company, "id">) => void;
  updateCompany: (id: string, company: Partial<Company>) => void;
  deleteCompany: (id: string) => void;

  addSector: (sector: Omit<Sector, "id">) => void;
  updateSector: (id: string, sector: Partial<Sector>) => void;
  deleteSector: (id: string) => void;

  addRole: (role: Omit<Role, "id">) => void;
  updateRole: (id: string, role: Partial<Role>) => void;
  deleteRole: (id: string) => void;

  addEmployee: (employee: Omit<Employee, "id">) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addPPE: (ppe: Omit<PPE, "id">) => void;
  updatePPE: (id: string, ppe: Partial<PPE>) => void;
  deletePPE: (id: string) => void;

  addPPEDelivery: (delivery: Omit<PPEDelivery, "id">) => void;
  updatePPEDelivery: (id: string, delivery: Partial<PPEDelivery>) => void;

  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;

  addDocument: (document: Omit<SSTDocument, "id">) => void;
  updateDocument: (id: string, document: Partial<SSTDocument>) => void;
  deleteDocument: (id: string) => void;

  addASO: (aso: Omit<ASO, "id">) => void;
  updateASO: (id: string, aso: Partial<ASO>) => void;
  deleteASO: (id: string) => void;

  addAbsence: (absence: Omit<Absence, "id">) => void;
  updateAbsence: (id: string, absence: Partial<Absence>) => void;
  deleteAbsence: (id: string) => void;

  addReferral: (referral: Omit<MedicalReferral, "id">) => void;
  updateReferral: (id: string, referral: Partial<MedicalReferral>) => void;
  deleteReferral: (id: string) => void;
}

const initialState: AppState = {
  companies: [],
  sectors: [],
  roles: [],
  employees: [],
  ppes: [],
  ppeDeliveries: [],
  transactions: [],
  documents: [],
  asos: [],
  absences: [],
  referrals: [],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem("sst-app-state");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse state from local storage", e);
      }
    }
    return {
      companies: [
        {
          id: "1",
          name: "Empresa Alpha Ltda",
          cnpj: "12.345.678/0001-90",
          address: "Rua A, 123",
          contact: "contato@alpha.com",
        },
        {
          id: "2",
          name: "Indústria Beta S.A.",
          cnpj: "98.765.432/0001-10",
          address: "Av B, 456",
          contact: "rh@beta.com",
        },
      ],
      sectors: [
        { id: "1", name: "Produção", description: "Área de manufatura" },
        { id: "2", name: "Administrativo", description: "Escritório central" },
      ],
      roles: [
        {
          id: "1",
          name: "Operador de Máquina",
          sectorId: "1",
          description: "Opera máquinas industriais",
        },
        {
          id: "2",
          name: "Auxiliar Administrativo",
          sectorId: "2",
          description: "Apoio administrativo",
        },
      ],
      employees: [
        {
          id: "1",
          name: "João Silva",
          cpf: "111.222.333-44",
          rg: "MG-12.345.678",
          birthDate: "1990-05-15",
          admissionDate: "2020-01-10",
          companyId: "1",
          roleId: "1",
          status: "active",
        },
        {
          id: "2",
          name: "Maria Souza",
          cpf: "555.666.777-88",
          rg: "SP-98.765.432",
          birthDate: "1985-11-20",
          admissionDate: "2019-03-01",
          companyId: "2",
          roleId: "2",
          status: "active",
        },
      ],
      ppes: [
        {
          id: "1",
          name: "Capacete de Segurança",
          ca: "12345",
          description: "Capacete classe B",
          stockQuantity: 50,
        },
        {
          id: "2",
          name: "Luva de Raspa",
          ca: "67890",
          description: "Luva para trabalhos pesados",
          stockQuantity: 100,
        },
        {
          id: "3",
          name: "Protetor Auricular",
          ca: "11223",
          description: "Protetor tipo plug",
          stockQuantity: 200,
        },
      ],
      ppeDeliveries: [
        {
          id: "1",
          employeeId: "1",
          ppeId: "1",
          quantity: 1,
          deliveryDate: "2023-10-01",
          reason: "Admissão",
          status: "delivered",
        },
      ],
      transactions: [
        {
          id: "1",
          companyId: "1",
          type: "income",
          amount: 5000,
          date: "2023-10-05",
          dueDate: "2023-10-10",
          description: "Faturamento Mensal - SST",
          status: "paid",
          category: "Faturamento",
        },
        {
          id: "2",
          companyId: "2",
          type: "income",
          amount: 3500,
          date: "2023-10-15",
          dueDate: "2023-10-20",
          description: "Treinamento NR-35",
          status: "pending",
          category: "Treinamentos",
        },
        {
          id: "3",
          companyId: "1",
          type: "expense",
          amount: 1200,
          date: "2023-10-02",
          dueDate: "2023-10-05",
          description: "Compra de EPIs",
          status: "paid",
          category: "Fornecedores",
        },
      ],
      documents: [
        {
          id: "1",
          companyId: "1",
          type: "PGR",
          title: "PGR 2023/2024",
          issueDate: "2023-01-15",
          validUntil: "2024-01-15",
          status: "active",
          hasInsalubrity: false,
          hasPericulosity: true,
          notes: "Renovação anual",
        },
        {
          id: "2",
          companyId: "2",
          type: "LTCAT",
          title: "LTCAT - Indústria Beta",
          issueDate: "2022-06-10",
          validUntil: "2023-06-10",
          status: "expired",
          hasInsalubrity: true,
          hasPericulosity: false,
          notes: "Necessita revisão",
        },
      ],
      asos: [
        {
          id: "1",
          employeeId: "1",
          type: "admissional",
          date: "2020-01-10",
          validUntil: "2021-01-10",
          result: "apto",
          doctor: "Dr. Silva",
          crm: "12345-SP",
          notes: "",
        },
        {
          id: "2",
          employeeId: "2",
          type: "periodico",
          date: "2023-05-20",
          validUntil: "2024-05-20",
          result: "apto",
          doctor: "Dra. Costa",
          crm: "54321-MG",
          notes: "Apto com restrição para altura",
        },
      ],
      absences: [
        {
          id: "1",
          employeeId: "1",
          startDate: "2023-08-01",
          endDate: "2023-08-15",
          reason: "doenca",
          cid: "J01.9",
          doctor: "Dr. Mendes",
          status: "finished",
        },
      ],
      referrals: [
        {
          id: "1",
          employeeId: "2",
          date: "2023-10-25",
          specialty: "Oftalmologia",
          reason: "Baixa acuidade visual relatada no periódico",
          status: "pending",
        },
      ],
    };
  });

  useEffect(() => {
    localStorage.setItem("sst-app-state", JSON.stringify(state));
  }, [state]);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addCompany = (company: Omit<Company, "id">) => {
    setState((prev) => ({
      ...prev,
      companies: [...prev.companies, { ...company, id: generateId() }],
    }));
  };
  const updateCompany = (id: string, company: Partial<Company>) => {
    setState((prev) => ({
      ...prev,
      companies: prev.companies.map((c) =>
        c.id === id ? { ...c, ...company } : c,
      ),
    }));
  };
  const deleteCompany = (id: string) => {
    setState((prev) => ({
      ...prev,
      companies: prev.companies.filter((c) => c.id !== id),
    }));
  };

  const addSector = (sector: Omit<Sector, "id">) => {
    setState((prev) => ({
      ...prev,
      sectors: [...prev.sectors, { ...sector, id: generateId() }],
    }));
  };
  const updateSector = (id: string, sector: Partial<Sector>) => {
    setState((prev) => ({
      ...prev,
      sectors: prev.sectors.map((s) => (s.id === id ? { ...s, ...sector } : s)),
    }));
  };
  const deleteSector = (id: string) => {
    setState((prev) => ({
      ...prev,
      sectors: prev.sectors.filter((s) => s.id !== id),
    }));
  };

  const addRole = (role: Omit<Role, "id">) => {
    setState((prev) => ({
      ...prev,
      roles: [...prev.roles, { ...role, id: generateId() }],
    }));
  };
  const updateRole = (id: string, role: Partial<Role>) => {
    setState((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === id ? { ...r, ...role } : r)),
    }));
  };
  const deleteRole = (id: string) => {
    setState((prev) => ({
      ...prev,
      roles: prev.roles.filter((r) => r.id !== id),
    }));
  };

  const addEmployee = (employee: Omit<Employee, "id">) => {
    setState((prev) => ({
      ...prev,
      employees: [...prev.employees, { ...employee, id: generateId() }],
    }));
  };
  const updateEmployee = (id: string, employee: Partial<Employee>) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) =>
        e.id === id ? { ...e, ...employee } : e,
      ),
    }));
  };
  const deleteEmployee = (id: string) => {
    setState((prev) => ({
      ...prev,
      employees: prev.employees.filter((e) => e.id !== id),
    }));
  };

  const addPPE = (ppe: Omit<PPE, "id">) => {
    setState((prev) => ({
      ...prev,
      ppes: [...prev.ppes, { ...ppe, id: generateId() }],
    }));
  };
  const updatePPE = (id: string, ppe: Partial<PPE>) => {
    setState((prev) => ({
      ...prev,
      ppes: prev.ppes.map((p) => (p.id === id ? { ...p, ...ppe } : p)),
    }));
  };
  const deletePPE = (id: string) => {
    setState((prev) => ({
      ...prev,
      ppes: prev.ppes.filter((p) => p.id !== id),
    }));
  };

  const addPPEDelivery = (delivery: Omit<PPEDelivery, "id">) => {
    setState((prev) => {
      // Decrease PPE stock
      const updatedPPEs = prev.ppes.map((p) => {
        if (p.id === delivery.ppeId) {
          return { ...p, stockQuantity: p.stockQuantity - delivery.quantity };
        }
        return p;
      });
      return {
        ...prev,
        ppes: updatedPPEs,
        ppeDeliveries: [
          ...prev.ppeDeliveries,
          { ...delivery, id: generateId() },
        ],
      };
    });
  };
  const updatePPEDelivery = (id: string, delivery: Partial<PPEDelivery>) => {
    setState((prev) => ({
      ...prev,
      ppeDeliveries: prev.ppeDeliveries.map((d) =>
        d.id === id ? { ...d, ...delivery } : d,
      ),
    }));
  };

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    setState((prev) => ({
      ...prev,
      transactions: [
        ...prev.transactions,
        { ...transaction, id: generateId() },
      ],
    }));
  };
  const updateTransaction = (id: string, transaction: Partial<Transaction>) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.map((t) =>
        t.id === id ? { ...t, ...transaction } : t,
      ),
    }));
  };
  const deleteTransaction = (id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }));
  };

  const addDocument = (document: Omit<SSTDocument, "id">) => {
    setState((prev) => ({
      ...prev,
      documents: [...prev.documents, { ...document, id: generateId() }],
    }));
  };
  const updateDocument = (id: string, document: Partial<SSTDocument>) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id ? { ...d, ...document } : d,
      ),
    }));
  };
  const deleteDocument = (id: string) => {
    setState((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
  };

  const addASO = (aso: Omit<ASO, "id">) => {
    setState((prev) => ({
      ...prev,
      asos: [...prev.asos, { ...aso, id: generateId() }],
    }));
  };
  const updateASO = (id: string, aso: Partial<ASO>) => {
    setState((prev) => ({
      ...prev,
      asos: prev.asos.map((a) => (a.id === id ? { ...a, ...aso } : a)),
    }));
  };
  const deleteASO = (id: string) => {
    setState((prev) => ({
      ...prev,
      asos: prev.asos.filter((a) => a.id !== id),
    }));
  };

  const addAbsence = (absence: Omit<Absence, "id">) => {
    setState((prev) => ({
      ...prev,
      absences: [...prev.absences, { ...absence, id: generateId() }],
    }));
  };
  const updateAbsence = (id: string, absence: Partial<Absence>) => {
    setState((prev) => ({
      ...prev,
      absences: prev.absences.map((a) =>
        a.id === id ? { ...a, ...absence } : a,
      ),
    }));
  };
  const deleteAbsence = (id: string) => {
    setState((prev) => ({
      ...prev,
      absences: prev.absences.filter((a) => a.id !== id),
    }));
  };

  const addReferral = (referral: Omit<MedicalReferral, "id">) => {
    setState((prev) => ({
      ...prev,
      referrals: [...prev.referrals, { ...referral, id: generateId() }],
    }));
  };
  const updateReferral = (id: string, referral: Partial<MedicalReferral>) => {
    setState((prev) => ({
      ...prev,
      referrals: prev.referrals.map((r) =>
        r.id === id ? { ...r, ...referral } : r,
      ),
    }));
  };
  const deleteReferral = (id: string) => {
    setState((prev) => ({
      ...prev,
      referrals: prev.referrals.filter((r) => r.id !== id),
    }));
  };

  return (
    <AppContext.Provider
      value={{
        ...state,
        addCompany,
        updateCompany,
        deleteCompany,
        addSector,
        updateSector,
        deleteSector,
        addRole,
        updateRole,
        deleteRole,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addPPE,
        updatePPE,
        deletePPE,
        addPPEDelivery,
        updatePPEDelivery,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addDocument,
        updateDocument,
        deleteDocument,
        addASO,
        updateASO,
        deleteASO,
        addAbsence,
        updateAbsence,
        deleteAbsence,
        addReferral,
        updateReferral,
        deleteReferral,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("metodo useAppContext é pra ser usado dentro do AppProvider");
  }
  return context;
};