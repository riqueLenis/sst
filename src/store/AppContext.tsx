import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
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
  UserRole,
} from "../types";
import { ApiError, apiClient, getApiErrorMessage } from "../lib/apiClient";
import { useAuth } from "./AuthContext";

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
  isLoading: boolean;
  isMutating: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addCompany: (company: Omit<Company, "id">) => Promise<boolean>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<boolean>;
  deleteCompany: (id: string) => Promise<boolean>;

  addSector: (sector: Omit<Sector, "id">) => Promise<boolean>;
  updateSector: (id: string, sector: Partial<Sector>) => Promise<boolean>;
  deleteSector: (id: string) => Promise<boolean>;

  addRole: (role: Omit<Role, "id">) => Promise<boolean>;
  updateRole: (id: string, role: Partial<Role>) => Promise<boolean>;
  deleteRole: (id: string) => Promise<boolean>;

  addEmployee: (employee: Omit<Employee, "id">) => Promise<boolean>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: string) => Promise<boolean>;

  addPPE: (ppe: Omit<PPE, "id">) => Promise<boolean>;
  updatePPE: (id: string, ppe: Partial<PPE>) => Promise<boolean>;
  deletePPE: (id: string) => Promise<boolean>;

  addPPEDelivery: (delivery: Omit<PPEDelivery, "id">) => Promise<boolean>;
  addPPEDeliveries: (deliveries: Array<Omit<PPEDelivery, "id">>) => Promise<boolean>;
  updatePPEDelivery: (id: string, delivery: Partial<PPEDelivery>) => Promise<boolean>;

  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<boolean>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;

  addDocument: (document: Omit<SSTDocument, "id">) => Promise<boolean>;
  updateDocument: (id: string, document: Partial<SSTDocument>) => Promise<boolean>;
  deleteDocument: (id: string) => Promise<boolean>;

  addASO: (aso: Omit<ASO, "id">) => Promise<boolean>;
  updateASO: (id: string, aso: Partial<ASO>) => Promise<boolean>;
  deleteASO: (id: string) => Promise<boolean>;

  addAbsence: (absence: Omit<Absence, "id">) => Promise<boolean>;
  updateAbsence: (id: string, absence: Partial<Absence>) => Promise<boolean>;
  deleteAbsence: (id: string) => Promise<boolean>;

  addReferral: (referral: Omit<MedicalReferral, "id">) => Promise<boolean>;
  updateReferral: (id: string, referral: Partial<MedicalReferral>) => Promise<boolean>;
  deleteReferral: (id: string) => Promise<boolean>;
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

type ResourceKey = keyof AppState;

const resourcePaths: Record<ResourceKey, string> = {
  companies: "/api/companies",
  sectors: "/api/sectors",
  roles: "/api/roles",
  employees: "/api/employees",
  ppes: "/api/ppes",
  ppeDeliveries: "/api/ppe-deliveries",
  transactions: "/api/transactions",
  documents: "/api/documents",
  asos: "/api/asos",
  absences: "/api/absences",
  referrals: "/api/referrals",
};

const resourceEntries = Object.entries(resourcePaths) as Array<
  [ResourceKey, string]
>;

const accessibleResourcesByRole: Record<UserRole, ResourceKey[]> = {
  admin: Object.keys(resourcePaths) as ResourceKey[],
  manager: Object.keys(resourcePaths) as ResourceKey[],
  technician: ["companies", "roles", "employees", "ppes", "ppeDeliveries"],
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { logout, token, user } = useAuth();
  const [state, setState] = useState<AppState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessibleResourceEntries = useMemo(() => {
    const allowedKeys = user?.role
      ? accessibleResourcesByRole[user.role]
      : (Object.keys(resourcePaths) as ResourceKey[]);

    return resourceEntries.filter(([key]) => allowedKeys.includes(key));
  }, [user?.role]);

  const handleUnauthorized = useCallback(
    (currentError: unknown) => {
      if (currentError instanceof ApiError && currentError.status === 401) {
        logout();
        return true;
      }

      return false;
    },
    [logout],
  );

  const refreshData = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!token) {
      setState(initialState);
      setIsLoading(false);
      setError(null);
      return;
    }

    // O refresh silencioso mantém o conteúdo atual na tela (usado após salvar/
    // excluir), evitando o "flash" do loader de página inteira a cada operação.
    if (!silent) {
      setIsLoading(true);
    }

    setError(null);

    try {
      const entries = await Promise.all(
        accessibleResourceEntries.map(async ([key, path]) => {
          const data = await apiClient.get<AppState[typeof key]>(path, {
            token,
          });

          return [key, data] as const;
        }),
      );

      setState(
        entries.reduce(
          (accumulator, [key, data]) => ({
            ...accumulator,
            [key]: data,
          }),
          { ...initialState },
        ) as AppState,
      );
    } catch (currentError) {
      if (handleUnauthorized(currentError)) {
        return;
      }

      setError(getApiErrorMessage(currentError));
    } finally {
      setIsLoading(false);
    }
  }, [accessibleResourceEntries, handleUnauthorized, token]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const runMutation = useCallback(
    async (operation: () => Promise<unknown>): Promise<boolean> => {
      if (!token) {
        logout();
        return false;
      }

      setIsMutating(true);

      try {
        await operation();
        await refreshData({ silent: true });
        return true;
      } catch (currentError) {
        if (handleUnauthorized(currentError)) {
          return false;
        }

        console.error(currentError);
        window.alert(getApiErrorMessage(currentError));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [handleUnauthorized, logout, refreshData, token],
  );

  const addCompany = useCallback(
    async (company: Omit<Company, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.companies, company, { token }));
    },
    [runMutation, token],
  );

  const updateCompany = useCallback(
    async (id: string, company: Partial<Company>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.companies}/${id}`, company, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.companies}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addSector = useCallback(
    async (sector: Omit<Sector, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.sectors, sector, { token }));
    },
    [runMutation, token],
  );

  const updateSector = useCallback(
    async (id: string, sector: Partial<Sector>) => {
      return runMutation(() => apiClient.patch(`${resourcePaths.sectors}/${id}`, sector, { token }));
    },
    [runMutation, token],
  );

  const deleteSector = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.sectors}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addRole = useCallback(
    async (role: Omit<Role, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.roles, role, { token }));
    },
    [runMutation, token],
  );

  const updateRole = useCallback(
    async (id: string, role: Partial<Role>) => {
      return runMutation(() => apiClient.patch(`${resourcePaths.roles}/${id}`, role, { token }));
    },
    [runMutation, token],
  );

  const deleteRole = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.roles}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addEmployee = useCallback(
    async (employee: Omit<Employee, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.employees, employee, { token }));
    },
    [runMutation, token],
  );

  const updateEmployee = useCallback(
    async (id: string, employee: Partial<Employee>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.employees}/${id}`, employee, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.employees}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addPPE = useCallback(
    async (ppe: Omit<PPE, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.ppes, ppe, { token }));
    },
    [runMutation, token],
  );

  const updatePPE = useCallback(
    async (id: string, ppe: Partial<PPE>) => {
      return runMutation(() => apiClient.patch(`${resourcePaths.ppes}/${id}`, ppe, { token }));
    },
    [runMutation, token],
  );

  const deletePPE = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.ppes}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addPPEDelivery = useCallback(
    async (delivery: Omit<PPEDelivery, "id">) => {
      return runMutation(() =>
        apiClient.post(resourcePaths.ppeDeliveries, delivery, { token }),
      );
    },
    [runMutation, token],
  );

  const addPPEDeliveries = useCallback(
    async (deliveries: Array<Omit<PPEDelivery, "id">>) => {
      return runMutation(async () => {
        // Registra cada EPI do lote em sequência; um único refresh acontece
        // ao final (dentro do runMutation).
        for (const delivery of deliveries) {
          await apiClient.post(resourcePaths.ppeDeliveries, delivery, { token });
        }
      });
    },
    [runMutation, token],
  );

  const updatePPEDelivery = useCallback(
    async (id: string, delivery: Partial<PPEDelivery>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.ppeDeliveries}/${id}`, delivery, { token }),
      );
    },
    [runMutation, token],
  );

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id">) => {
      return runMutation(() =>
        apiClient.post(resourcePaths.transactions, transaction, { token }),
      );
    },
    [runMutation, token],
  );

  const updateTransaction = useCallback(
    async (id: string, transaction: Partial<Transaction>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.transactions}/${id}`, transaction, {
          token,
        }),
      );
    },
    [runMutation, token],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.transactions}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addDocument = useCallback(
    async (document: Omit<SSTDocument, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.documents, document, { token }));
    },
    [runMutation, token],
  );

  const updateDocument = useCallback(
    async (id: string, document: Partial<SSTDocument>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.documents}/${id}`, document, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.documents}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addASO = useCallback(
    async (aso: Omit<ASO, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.asos, aso, { token }));
    },
    [runMutation, token],
  );

  const updateASO = useCallback(
    async (id: string, aso: Partial<ASO>) => {
      return runMutation(() => apiClient.patch(`${resourcePaths.asos}/${id}`, aso, { token }));
    },
    [runMutation, token],
  );

  const deleteASO = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.asos}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addAbsence = useCallback(
    async (absence: Omit<Absence, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.absences, absence, { token }));
    },
    [runMutation, token],
  );

  const updateAbsence = useCallback(
    async (id: string, absence: Partial<Absence>) => {
      return runMutation(() => apiClient.patch(`${resourcePaths.absences}/${id}`, absence, { token }));
    },
    [runMutation, token],
  );

  const deleteAbsence = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.absences}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addReferral = useCallback(
    async (referral: Omit<MedicalReferral, "id">) => {
      return runMutation(() => apiClient.post(resourcePaths.referrals, referral, { token }));
    },
    [runMutation, token],
  );

  const updateReferral = useCallback(
    async (id: string, referral: Partial<MedicalReferral>) => {
      return runMutation(() =>
        apiClient.patch(`${resourcePaths.referrals}/${id}`, referral, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteReferral = useCallback(
    async (id: string) => {
      return runMutation(() => apiClient.delete(`${resourcePaths.referrals}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
      isMutating,
      error,
      refreshData,
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
      addPPEDeliveries,
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
    }),
    [
      state,
      isLoading,
      isMutating,
      error,
      refreshData,
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
      addPPEDeliveries,
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
    ],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error(
      "metodo useAppContext é pra ser usado dentro do AppProvider",
    );
  }
  return context;
};
