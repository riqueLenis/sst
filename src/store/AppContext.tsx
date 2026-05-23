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
  error: string | null;
  refreshData: () => Promise<void>;
  addCompany: (company: Omit<Company, "id">) => Promise<void>;
  updateCompany: (id: string, company: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;

  addSector: (sector: Omit<Sector, "id">) => Promise<void>;
  updateSector: (id: string, sector: Partial<Sector>) => Promise<void>;
  deleteSector: (id: string) => Promise<void>;

  addRole: (role: Omit<Role, "id">) => Promise<void>;
  updateRole: (id: string, role: Partial<Role>) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;

  addEmployee: (employee: Omit<Employee, "id">) => Promise<void>;
  updateEmployee: (id: string, employee: Partial<Employee>) => Promise<void>;
  deleteEmployee: (id: string) => Promise<void>;

  addPPE: (ppe: Omit<PPE, "id">) => Promise<void>;
  updatePPE: (id: string, ppe: Partial<PPE>) => Promise<void>;
  deletePPE: (id: string) => Promise<void>;

  addPPEDelivery: (delivery: Omit<PPEDelivery, "id">) => Promise<void>;
  updatePPEDelivery: (id: string, delivery: Partial<PPEDelivery>) => Promise<void>;

  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addDocument: (document: Omit<SSTDocument, "id">) => Promise<void>;
  updateDocument: (id: string, document: Partial<SSTDocument>) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;

  addASO: (aso: Omit<ASO, "id">) => Promise<void>;
  updateASO: (id: string, aso: Partial<ASO>) => Promise<void>;
  deleteASO: (id: string) => Promise<void>;

  addAbsence: (absence: Omit<Absence, "id">) => Promise<void>;
  updateAbsence: (id: string, absence: Partial<Absence>) => Promise<void>;
  deleteAbsence: (id: string) => Promise<void>;

  addReferral: (referral: Omit<MedicalReferral, "id">) => Promise<void>;
  updateReferral: (id: string, referral: Partial<MedicalReferral>) => Promise<void>;
  deleteReferral: (id: string) => Promise<void>;
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

  const refreshData = useCallback(async () => {
    if (!token) {
      setState(initialState);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
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
    async (operation: () => Promise<unknown>) => {
      if (!token) {
        logout();
        return;
      }

      try {
        await operation();
        await refreshData();
      } catch (currentError) {
        if (handleUnauthorized(currentError)) {
          return;
        }

        console.error(currentError);
        window.alert(getApiErrorMessage(currentError));
      }
    },
    [handleUnauthorized, logout, refreshData, token],
  );

  const addCompany = useCallback(
    async (company: Omit<Company, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.companies, company, { token }));
    },
    [runMutation, token],
  );

  const updateCompany = useCallback(
    async (id: string, company: Partial<Company>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.companies}/${id}`, company, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteCompany = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.companies}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addSector = useCallback(
    async (sector: Omit<Sector, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.sectors, sector, { token }));
    },
    [runMutation, token],
  );

  const updateSector = useCallback(
    async (id: string, sector: Partial<Sector>) => {
      await runMutation(() => apiClient.patch(`${resourcePaths.sectors}/${id}`, sector, { token }));
    },
    [runMutation, token],
  );

  const deleteSector = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.sectors}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addRole = useCallback(
    async (role: Omit<Role, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.roles, role, { token }));
    },
    [runMutation, token],
  );

  const updateRole = useCallback(
    async (id: string, role: Partial<Role>) => {
      await runMutation(() => apiClient.patch(`${resourcePaths.roles}/${id}`, role, { token }));
    },
    [runMutation, token],
  );

  const deleteRole = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.roles}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addEmployee = useCallback(
    async (employee: Omit<Employee, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.employees, employee, { token }));
    },
    [runMutation, token],
  );

  const updateEmployee = useCallback(
    async (id: string, employee: Partial<Employee>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.employees}/${id}`, employee, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.employees}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addPPE = useCallback(
    async (ppe: Omit<PPE, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.ppes, ppe, { token }));
    },
    [runMutation, token],
  );

  const updatePPE = useCallback(
    async (id: string, ppe: Partial<PPE>) => {
      await runMutation(() => apiClient.patch(`${resourcePaths.ppes}/${id}`, ppe, { token }));
    },
    [runMutation, token],
  );

  const deletePPE = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.ppes}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addPPEDelivery = useCallback(
    async (delivery: Omit<PPEDelivery, "id">) => {
      await runMutation(() =>
        apiClient.post(resourcePaths.ppeDeliveries, delivery, { token }),
      );
    },
    [runMutation, token],
  );

  const updatePPEDelivery = useCallback(
    async (id: string, delivery: Partial<PPEDelivery>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.ppeDeliveries}/${id}`, delivery, { token }),
      );
    },
    [runMutation, token],
  );

  const addTransaction = useCallback(
    async (transaction: Omit<Transaction, "id">) => {
      await runMutation(() =>
        apiClient.post(resourcePaths.transactions, transaction, { token }),
      );
    },
    [runMutation, token],
  );

  const updateTransaction = useCallback(
    async (id: string, transaction: Partial<Transaction>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.transactions}/${id}`, transaction, {
          token,
        }),
      );
    },
    [runMutation, token],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.transactions}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addDocument = useCallback(
    async (document: Omit<SSTDocument, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.documents, document, { token }));
    },
    [runMutation, token],
  );

  const updateDocument = useCallback(
    async (id: string, document: Partial<SSTDocument>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.documents}/${id}`, document, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteDocument = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.documents}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addASO = useCallback(
    async (aso: Omit<ASO, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.asos, aso, { token }));
    },
    [runMutation, token],
  );

  const updateASO = useCallback(
    async (id: string, aso: Partial<ASO>) => {
      await runMutation(() => apiClient.patch(`${resourcePaths.asos}/${id}`, aso, { token }));
    },
    [runMutation, token],
  );

  const deleteASO = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.asos}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addAbsence = useCallback(
    async (absence: Omit<Absence, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.absences, absence, { token }));
    },
    [runMutation, token],
  );

  const updateAbsence = useCallback(
    async (id: string, absence: Partial<Absence>) => {
      await runMutation(() => apiClient.patch(`${resourcePaths.absences}/${id}`, absence, { token }));
    },
    [runMutation, token],
  );

  const deleteAbsence = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.absences}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const addReferral = useCallback(
    async (referral: Omit<MedicalReferral, "id">) => {
      await runMutation(() => apiClient.post(resourcePaths.referrals, referral, { token }));
    },
    [runMutation, token],
  );

  const updateReferral = useCallback(
    async (id: string, referral: Partial<MedicalReferral>) => {
      await runMutation(() =>
        apiClient.patch(`${resourcePaths.referrals}/${id}`, referral, { token }),
      );
    },
    [runMutation, token],
  );

  const deleteReferral = useCallback(
    async (id: string) => {
      await runMutation(() => apiClient.delete(`${resourcePaths.referrals}/${id}`, { token }));
    },
    [runMutation, token],
  );

  const value = useMemo(
    () => ({
      ...state,
      isLoading,
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
