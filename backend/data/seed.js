const emptyState = {
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

export const createInitialState = () => structuredClone(emptyState);
