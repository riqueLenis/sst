import React, { useMemo, useState } from "react";
import { useAppContext } from "../store/AppContext";
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Coins,
  Download,
  HardHat,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { exportTableToPDF } from "../lib/pdfUtils";
import { useAuth } from "../store/AuthContext";
import type { PPE } from "../types";

const DEFAULT_MINIMUM_STOCK = 5;
const DEFAULT_USEFUL_LIFE_DAYS = 180;
const ANALYSIS_WINDOW_DAYS = 30;
const MS_PER_DAY = 86_400_000;

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

type PPEFormState = {
  name: string;
  ca: string;
  description: string;
  stockQuantity: number;
  unitCost: number;
  minimumStock: number;
  usefulLifeDays: number;
};

type PPEAnalyticsRow = {
  id: string;
  name: string;
  stockQuantity: number;
  minimumStock: number;
  usefulLifeDays: number;
  unitCost: number;
  stockValue: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  lostQuantity: number;
  recentQuantity: number;
  previousQuantity: number;
  totalDeliveryCost: number;
  replenishmentUnits: number;
  replenishmentCost: number;
  dailyUsage: number;
  targetCoverageDays: number;
  recommendedStock: number;
  purchaseQuantity: number;
  purchaseCost: number;
  needsPurchase: boolean;
  purchaseUrgency: "Urgente" | "Planejado";
  purchaseDrivers: string[];
  averageUsageDays: number | null;
  estimatedCoverageDays: number | null;
  usefulLifeStatus: string;
  consumptionDelta: number;
  lowStock: boolean;
};

const getPpeUnitCost = (ppe: PPE) => ppe.unitCost ?? 0;

const getPpeMinimumStock = (ppe: PPE) =>
  ppe.minimumStock ?? DEFAULT_MINIMUM_STOCK;

const getPpeUsefulLifeDays = (ppe: PPE) =>
  ppe.usefulLifeDays ?? DEFAULT_USEFUL_LIFE_DAYS;

const parseDateValue = (value?: string) => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.includes("T") ? value : `${value}T00:00:00`;
  const timestamp = new Date(normalizedValue).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
};

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatWholeNumber = (value: number) => numberFormatter.format(value);

export default function PPEs() {
  const { ppes, ppeDeliveries, employees, addPPE, updatePPE, deletePPE } =
    useAppContext();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PPEFormState>({
    name: "",
    ca: "",
    description: "",
    stockQuantity: 0,
    unitCost: 0,
    minimumStock: DEFAULT_MINIMUM_STOCK,
    usefulLifeDays: DEFAULT_USEFUL_LIFE_DAYS,
  });
  const [searchTerm, setSearchTerm] = useState("");

  const canCreatePPEs =
    user?.role === "admin" ||
    user?.role === "manager" ||
    user?.role === "technician";
  const canEditPPEs = user?.role === "admin" || user?.role === "manager";

  const showCreatePermissionAlert = () => {
    window.alert(
      "Somente usuários com perfil Técnico, Gestor ou Admin podem cadastrar novos itens no estoque de EPIs.",
    );
  };

  const showEditPermissionAlert = () => {
    window.alert(
      "Somente usuários com perfil Gestor ou Admin podem editar ou excluir itens do estoque de EPIs.",
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSaving) {
      return;
    }

    if (editingId && !canEditPPEs) {
      showEditPermissionAlert();
      return;
    }

    if (!editingId && !canCreatePPEs) {
      showCreatePermissionAlert();
      return;
    }

    setIsSaving(true);

    try {
      const saved = editingId
        ? await updatePPE(editingId, formData)
        : await addPPE(formData);

      if (!saved) {
        return;
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        ca: "",
        description: "",
        stockQuantity: 0,
        unitCost: 0,
        minimumStock: DEFAULT_MINIMUM_STOCK,
        usefulLifeDays: DEFAULT_USEFUL_LIFE_DAYS,
      });
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (ppe: PPE) => {
    if (!canEditPPEs) {
      showEditPermissionAlert();
      return;
    }

    setFormData({
      name: ppe.name,
      ca: ppe.ca,
      description: ppe.description,
      stockQuantity: ppe.stockQuantity,
      unitCost: getPpeUnitCost(ppe),
      minimumStock: getPpeMinimumStock(ppe),
      usefulLifeDays: getPpeUsefulLifeDays(ppe),
    });
    setEditingId(ppe.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (!canEditPPEs) {
      showEditPermissionAlert();
      return;
    }

    if (window.confirm("Tem certeza que deseja excluir este EPI?")) {
      deletePPE(id);
    }
  };

  const handleExportPDF = () => {
    const columns = [
      "Nome do Equipamento",
      "CA",
      "Descrição",
      "Custo Unitário",
      "Estoque",
      "Estoque Mínimo",
      "Vida Útil (dias)",
      "Valor em Estoque",
    ];
    const data = filteredPPEs.map((p) => [
      p.name,
      p.ca,
      p.description,
      formatCurrency(getPpeUnitCost(p)),
      p.stockQuantity.toString(),
      getPpeMinimumStock(p).toString(),
      getPpeUsefulLifeDays(p).toString(),
      formatCurrency(p.stockQuantity * getPpeUnitCost(p)),
    ]);
    exportTableToPDF(
      "Relatório de Estoque de EPIs",
      columns,
      data,
      "estoque_epis_sst_pro",
      {
        tag: "Estoque e custos",
        description:
          "Inventário de equipamentos de proteção individual com CA, níveis de estoque, vida útil e valor imobilizado.",
        highlights: [
          { label: "Itens listados", value: String(data.length) },
          {
            label: "Unidades em estoque",
            value: String(
              filteredPPEs.reduce((total, ppe) => total + ppe.stockQuantity, 0),
            ),
          },
          {
            label: "Abaixo do mínimo",
            value: String(
              filteredPPEs.filter(
                (ppe) => ppe.stockQuantity < getPpeMinimumStock(ppe),
              ).length,
            ),
          },
          {
            label: "Valor em estoque",
            value: formatCurrency(
              filteredPPEs.reduce(
                (total, ppe) => total + ppe.stockQuantity * getPpeUnitCost(ppe),
                0,
              ),
            ),
          },
        ],
      },
    );
  };

  const filteredPPEs = ppes.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ca.includes(searchTerm) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const analyticsRows = useMemo<PPEAnalyticsRow[]>(() => {
    const now = Date.now();
    const recentWindowStart = now - ANALYSIS_WINDOW_DAYS * MS_PER_DAY;
    const previousWindowStart = now - ANALYSIS_WINDOW_DAYS * 2 * MS_PER_DAY;

    return ppes.map((ppe) => {
      const relatedDeliveries = ppeDeliveries.filter(
        (delivery) => delivery.ppeId === ppe.id,
      );
      const usageDurations: number[] = [];

      let deliveredQuantity = 0;
      let returnedQuantity = 0;
      let lostQuantity = 0;
      let recentQuantity = 0;
      let previousQuantity = 0;

      relatedDeliveries.forEach((delivery) => {
        deliveredQuantity += delivery.quantity;

        if (delivery.status === "returned") {
          returnedQuantity += delivery.quantity;
        }

        if (delivery.status === "lost") {
          lostQuantity += delivery.quantity;
        }

        const deliveryTimestamp = parseDateValue(delivery.deliveryDate);

        if (deliveryTimestamp !== null) {
          if (deliveryTimestamp >= recentWindowStart) {
            recentQuantity += delivery.quantity;
          } else if (deliveryTimestamp >= previousWindowStart) {
            previousQuantity += delivery.quantity;
          }
        }

        const returnTimestamp = parseDateValue(delivery.returnDate);

        if (
          deliveryTimestamp !== null &&
          returnTimestamp !== null &&
          returnTimestamp > deliveryTimestamp
        ) {
          usageDurations.push(
            (returnTimestamp - deliveryTimestamp) / MS_PER_DAY,
          );
        }
      });

      const unitCost = getPpeUnitCost(ppe);
      const minimumStock = getPpeMinimumStock(ppe);
      const usefulLifeDays = getPpeUsefulLifeDays(ppe);
      const averageUsageDays =
        usageDurations.length > 0
          ? usageDurations.reduce((total, current) => total + current, 0) /
            usageDurations.length
          : null;
      const fallbackDailyUsage =
        previousQuantity > 0
          ? previousQuantity / ANALYSIS_WINDOW_DAYS
          : deliveredQuantity > 0
            ? deliveredQuantity /
              Math.max(usefulLifeDays, ANALYSIS_WINDOW_DAYS)
            : 0;
      const dailyUsage =
        recentQuantity > 0
          ? recentQuantity / ANALYSIS_WINDOW_DAYS
          : fallbackDailyUsage;
      const targetCoverageDays = Math.max(
        ANALYSIS_WINDOW_DAYS,
        Math.min(usefulLifeDays, 60),
      );
      const lifePressureFactor =
        averageUsageDays !== null && averageUsageDays < usefulLifeDays
          ? 1 + (usefulLifeDays - averageUsageDays) / usefulLifeDays
          : 1;
      const movementAdjustmentUnits = Math.max(
        lostQuantity,
        recentQuantity - previousQuantity,
        0,
      );
      const recommendedStock = Math.max(
        minimumStock,
        Math.ceil(dailyUsage * targetCoverageDays * lifePressureFactor) +
          movementAdjustmentUnits,
      );
      const purchaseQuantity = Math.max(
        0,
        recommendedStock - ppe.stockQuantity,
      );
      const purchaseDrivers: string[] = [];

      if (ppe.stockQuantity <= minimumStock) {
        purchaseDrivers.push("estoque abaixo do mínimo operacional");
      }

      if (recentQuantity > previousQuantity) {
        purchaseDrivers.push("consumo em alta no período mais recente");
      }

      if (averageUsageDays !== null && averageUsageDays < usefulLifeDays) {
        purchaseDrivers.push("vida útil observada menor que a prevista");
      }

      if (lostQuantity > 0) {
        purchaseDrivers.push("extravios registrados nas movimentações");
      }

      if (purchaseDrivers.length === 0 && purchaseQuantity > 0) {
        purchaseDrivers.push("cobertura projetada insuficiente para o próximo ciclo");
      }

      const stockValue = ppe.stockQuantity * unitCost;
      const totalDeliveryCost = deliveredQuantity * unitCost;
      const replenishmentUnits = Math.max(minimumStock - ppe.stockQuantity, 0);
      const replenishmentCost = replenishmentUnits * unitCost;
      const estimatedCoverageDays =
        dailyUsage > 0
          ? ppe.stockQuantity / dailyUsage
          : null;
      const consumptionDelta =
        previousQuantity === 0
          ? recentQuantity > 0
            ? 100
            : 0
          : ((recentQuantity - previousQuantity) / previousQuantity) * 100;

      let usefulLifeStatus = "Sem histórico";

      if (averageUsageDays !== null) {
        if (averageUsageDays >= usefulLifeDays) {
          usefulLifeStatus = "Dentro do previsto";
        } else if (averageUsageDays >= usefulLifeDays * 0.8) {
          usefulLifeStatus = "Atenção";
        } else {
          usefulLifeStatus = "Troca antecipada";
        }
      }

      return {
        id: ppe.id,
        name: ppe.name,
        stockQuantity: ppe.stockQuantity,
        minimumStock,
        usefulLifeDays,
        unitCost,
        stockValue,
        deliveredQuantity,
        returnedQuantity,
        lostQuantity,
        recentQuantity,
        previousQuantity,
        totalDeliveryCost,
        replenishmentUnits,
        replenishmentCost,
        dailyUsage,
        targetCoverageDays,
        recommendedStock,
        purchaseQuantity,
        purchaseCost: purchaseQuantity * unitCost,
        needsPurchase: purchaseQuantity > 0,
        purchaseUrgency:
          ppe.stockQuantity <= minimumStock ||
          (estimatedCoverageDays !== null &&
            estimatedCoverageDays < targetCoverageDays / 2)
            ? "Urgente"
            : "Planejado",
        purchaseDrivers,
        averageUsageDays,
        estimatedCoverageDays,
        usefulLifeStatus,
        consumptionDelta,
        lowStock: ppe.stockQuantity <= minimumStock,
      };
    });
  }, [ppes, ppeDeliveries]);

  const lowStockItems = useMemo(
    () =>
      analyticsRows
        .filter((item) => item.lowStock)
        .sort((left, right) => left.stockQuantity - right.stockQuantity),
    [analyticsRows],
  );

  const summary = useMemo(() => {
    const averageUsageSamples = analyticsRows.filter(
      (item) => item.averageUsageDays !== null,
    );
    const totalRecentConsumption = analyticsRows.reduce(
      (total, item) => total + item.recentQuantity,
      0,
    );

    return {
      totalStockValue: analyticsRows.reduce(
        (total, item) => total + item.stockValue,
        0,
      ),
      totalDeliveryCost: analyticsRows.reduce(
        (total, item) => total + item.totalDeliveryCost,
        0,
      ),
      totalReplenishmentCost: analyticsRows.reduce(
        (total, item) => total + item.replenishmentCost,
        0,
      ),
      totalRecentConsumption,
      lowStockCount: lowStockItems.length,
      averageObservedUsefulLife:
        averageUsageSamples.length > 0
          ? averageUsageSamples.reduce(
              (total, item) => total + (item.averageUsageDays ?? 0),
              0,
            ) / averageUsageSamples.length
          : null,
    };
  }, [analyticsRows, lowStockItems.length]);

  const topConsumers = useMemo(() => {
    const ppeById = new Map(ppes.map((ppe) => [ppe.id, ppe]));
    const employeeUsage = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalQuantity: number;
        totalCost: number;
      }
    >();

    ppeDeliveries.forEach((delivery) => {
      const employee = employees.find(
        (currentEmployee) => currentEmployee.id === delivery.employeeId,
      );
      const ppe = ppeById.get(delivery.ppeId);

      if (!employee || !ppe) {
        return;
      }

      const existingUsage = employeeUsage.get(employee.id) ?? {
        employeeId: employee.id,
        employeeName: employee.name,
        totalQuantity: 0,
        totalCost: 0,
      };

      existingUsage.totalQuantity += delivery.quantity;
      existingUsage.totalCost += delivery.quantity * getPpeUnitCost(ppe);

      employeeUsage.set(employee.id, existingUsage);
    });

    return Array.from(employeeUsage.values())
      .sort(
        (left, right) =>
          right.totalCost - left.totalCost ||
          right.totalQuantity - left.totalQuantity,
      )
      .slice(0, 5);
  }, [employees, ppeDeliveries, ppes]);

  const consumptionComparisonRows = useMemo(
    () =>
      [...analyticsRows]
        .filter(
          (item) => item.recentQuantity > 0 || item.previousQuantity > 0,
        )
        .sort(
          (left, right) =>
            right.recentQuantity - left.recentQuantity ||
            right.deliveredQuantity - left.deliveredQuantity,
        ),
    [analyticsRows],
  );

  const usefulLifeRows = useMemo(
    () =>
      [...analyticsRows].sort(
        (left, right) =>
          Number(right.lowStock) - Number(left.lowStock) ||
          right.deliveredQuantity - left.deliveredQuantity,
      ),
    [analyticsRows],
  );

  const purchasePlanRows = useMemo(
    () =>
      [...analyticsRows]
        .filter((item) => item.needsPurchase)
        .sort(
          (left, right) =>
            Number(right.purchaseUrgency === "Urgente") -
              Number(left.purchaseUrgency === "Urgente") ||
            right.purchaseCost - left.purchaseCost ||
            right.purchaseQuantity - left.purchaseQuantity,
        ),
    [analyticsRows],
  );

  const purchasePlanSummary = useMemo(
    () => ({
      totalItems: purchasePlanRows.length,
      urgentItems: purchasePlanRows.filter(
        (item) => item.purchaseUrgency === "Urgente",
      ).length,
      totalUnits: purchasePlanRows.reduce(
        (total, item) => total + item.purchaseQuantity,
        0,
      ),
      totalCost: purchasePlanRows.reduce(
        (total, item) => total + item.purchaseCost,
        0,
      ),
    }),
    [purchasePlanRows],
  );

  const summaryCards = [
    {
      title: "Custo estimado em estoque",
      value: formatCurrency(summary.totalStockValue),
      helper: "Valor aproximado do estoque atual de EPIs.",
      icon: Coins,
      accent: "from-amber-500 to-orange-500",
    },
    {
      title: "Custo acumulado de entregas",
      value: formatCurrency(summary.totalDeliveryCost),
      helper: "Estimativa somada a partir das entregas registradas.",
      icon: TrendingUp,
      accent: "from-blue-500 to-sky-500",
    },
    {
      title: "Consumo nos últimos 30 dias",
      value: `${formatWholeNumber(summary.totalRecentConsumption)} un`,
      helper: "Comparativo usado para projeções de reposição.",
      icon: BarChart3,
      accent: "from-emerald-500 to-teal-500",
    },
    {
      title: "Reposição imediata estimada",
      value: formatCurrency(summary.totalReplenishmentCost),
      helper:
        summary.averageObservedUsefulLife !== null
          ? `Vida útil média observada: ${formatWholeNumber(summary.averageObservedUsefulLife)} dias.`
          : "Sem histórico suficiente para média de vida útil observada.",
      icon: Clock3,
      accent: "from-rose-500 to-orange-500",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <HardHat className="w-6 h-6 text-blue-600" />
            </div>
            Estoque de EPIs
          </h1>
          <p className="mt-1">
            Gerencie o catálogo, o estoque e a disponibilidade dos EPIs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportPDF}
            disabled={ppes.length === 0}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF
          </button>
          {canCreatePPEs && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: "",
                  ca: "",
                  description: "",
                  stockQuantity: 0,
                  unitCost: 0,
                  minimumStock: DEFAULT_MINIMUM_STOCK,
                  usefulLifeDays: DEFAULT_USEFUL_LIFE_DAYS,
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 h-10 px-4 py-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo EPI
            </button>
          )}
        </div>
      </div>

      {user?.role === "technician" && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          O perfil Técnico pode cadastrar novos itens no estoque de EPIs, mas a edição e a exclusão continuam sob responsabilidade do Gestor ou Admin.
        </div>
      )}

      {!canCreatePPEs && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Somente usuários com perfil Gestor ou Admin podem cadastrar, editar ou excluir itens do estoque de EPIs. Nesta sessão, o módulo está em modo consulta.
        </div>
      )}

      {lowStockItems.length > 0 ? (
        <div className="rounded-3xl border border-red-200 bg-red-50/90 p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-red-800">
                <AlertTriangle className="h-4 w-4" />
                Alertas automáticos de baixo estoque
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                {lowStockItems.length} item(ns) precisam de reposição imediata
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Custo estimado para voltar ao estoque mínimo: {" "}
                <span className="font-semibold text-slate-900">
                  {formatCurrency(summary.totalReplenishmentCost)}
                </span>
              </p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Reposição recomendada</p>
              <p className="mt-1">
                Priorize os itens abaixo do mínimo operacional e acompanhe o consumo recente para evitar ruptura de estoque.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-red-100 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Estoque atual {item.stockQuantity} un • mínimo {item.minimumStock} un
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    Crítico
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Reposição mínima</span>
                  <span className="font-semibold text-slate-900">
                    {item.replenishmentUnits} un
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Custo estimado</span>
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(item.replenishmentCost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Nenhum alerta automático de baixo estoque no momento. Os limites mínimos cadastrados estão sendo respeitados.
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <ShoppingCart className="h-4 w-4 text-blue-600" />
            Lista de compras integrada ao estoque
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Compra automática sugerida para reposição e cobertura
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Cruza estoque, consumo e vida útil para prever a reposição necessária.
          </p>
        </div>

        <div className="grid gap-4 border-b border-slate-100 bg-slate-50/60 px-6 py-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Itens a comprar
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {purchasePlanSummary.totalItems}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Prioridade urgente
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {purchasePlanSummary.urgentItems}
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quantidade projetada
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatWholeNumber(purchasePlanSummary.totalUnits)} un
            </p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Custo estimado
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(purchasePlanSummary.totalCost)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">EPI</th>
                <th className="px-6 py-4">Estoque e meta</th>
                <th className="px-6 py-4">Consumo e movimentações</th>
                <th className="px-6 py-4">Vida útil e cobertura</th>
                <th className="px-6 py-4">Comprar</th>
                <th className="px-6 py-4">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchasePlanRows.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          item.purchaseUrgency === "Urgente"
                            ? "border-red-100 bg-red-50 text-red-700"
                            : "border-blue-100 bg-blue-50 text-blue-700"
                        }`}
                      >
                        {item.purchaseUrgency}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p>Atual: {formatWholeNumber(item.stockQuantity)} un</p>
                    <p className="text-slate-500">
                      Meta sugerida: {formatWholeNumber(item.recommendedStock)} un
                    </p>
                    <p className="text-slate-500">
                      Mínimo cadastrado: {formatWholeNumber(item.minimumStock)} un
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p>
                      {formatWholeNumber(item.recentQuantity)} un nos últimos 30 dias
                    </p>
                    <p className="text-slate-500">
                      Consumo diário projetado: {item.dailyUsage.toFixed(1)} un
                    </p>
                    <p className="text-slate-500">
                      Devoluções: {formatWholeNumber(item.returnedQuantity)} un • Extravios: {formatWholeNumber(item.lostQuantity)} un
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p>
                      Vida útil cadastrada: {formatWholeNumber(item.usefulLifeDays)} dias
                    </p>
                    <p className="text-slate-500">
                      Vida útil observada: {item.averageUsageDays !== null
                        ? `${formatWholeNumber(item.averageUsageDays)} dias`
                        : "Sem histórico"}
                    </p>
                    <p className="text-slate-500">
                      Cobertura estimada: {item.estimatedCoverageDays !== null
                        ? `${formatWholeNumber(item.estimatedCoverageDays)} dias`
                        : "Sem histórico recente"}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-900">
                      {formatWholeNumber(item.purchaseQuantity)} un
                    </p>
                    <p className="text-slate-500">
                      {formatCurrency(item.purchaseCost)}
                    </p>
                    <p className="text-slate-500">
                      Horizonte: {formatWholeNumber(item.targetCoverageDays)} dias
                    </p>
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {item.purchaseDrivers.join("; ")}
                  </td>
                </tr>
              ))}
              {purchasePlanRows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Nenhum item precisa entrar automaticamente na lista de compras neste momento. O estoque atual cobre o consumo previsto e o ciclo de vida útil observado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {card.title}
                </p>
                <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                  {card.value}
                </p>
              </div>
              <div
                className={`rounded-2xl bg-gradient-to-br p-3 text-white shadow-sm ${card.accent}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Users className="h-4 w-4 text-blue-600" />
              Colaboradores que mais utilizam/gastam EPIs
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Ranking de consumo por colaborador
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-6 py-4">Colaborador</th>
                  <th className="px-6 py-4">Qtd total</th>
                  <th className="px-6 py-4">Custo estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topConsumers.map((consumer) => (
                  <tr key={consumer.employeeId} className="bg-white">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {consumer.employeeName}
                    </td>
                    <td className="px-6 py-4">
                      {formatWholeNumber(consumer.totalQuantity)} un
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatCurrency(consumer.totalCost)}
                    </td>
                  </tr>
                ))}
                {topConsumers.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      As entregas registradas alimentarão automaticamente este ranking de uso e gasto de EPIs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              Comparativo de consumo
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Últimos 30 dias vs. período anterior
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-600">
              <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-6 py-4">EPI</th>
                  <th className="px-6 py-4">Últimos 30 dias</th>
                  <th className="px-6 py-4">30 dias anteriores</th>
                  <th className="px-6 py-4">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {consumptionComparisonRows.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.name}
                    </td>
                    <td className="px-6 py-4">
                      {formatWholeNumber(item.recentQuantity)} un
                    </td>
                    <td className="px-6 py-4">
                      {formatWholeNumber(item.previousQuantity)} un
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          item.consumptionDelta > 0
                            ? "border-red-100 bg-red-50 text-red-700"
                            : item.consumptionDelta < 0
                              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.consumptionDelta > 0 ? "+" : ""}
                        {item.consumptionDelta.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {consumptionComparisonRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      Ainda não há consumo suficiente nos períodos comparados para montar esta análise.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <Clock3 className="h-4 w-4 text-blue-600" />
            Controle e estimativa de vida útil
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Projeção de uso, cobertura e desgaste dos EPIs
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs uppercase text-slate-500 bg-slate-50 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">EPI</th>
                <th className="px-6 py-4">Vida útil cadastrada</th>
                <th className="px-6 py-4">Média observada</th>
                <th className="px-6 py-4">Cobertura do estoque</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usefulLifeRows.map((item) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {item.name}
                  </td>
                  <td className="px-6 py-4">
                    {formatWholeNumber(item.usefulLifeDays)} dias
                  </td>
                  <td className="px-6 py-4">
                    {item.averageUsageDays !== null
                      ? `${formatWholeNumber(item.averageUsageDays)} dias`
                      : "Sem histórico"}
                  </td>
                  <td className="px-6 py-4">
                    {item.estimatedCoverageDays !== null
                      ? `${formatWholeNumber(item.estimatedCoverageDays)} dias`
                      : "Sem histórico recente"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        item.usefulLifeStatus === "Dentro do previsto"
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : item.usefulLifeStatus === "Atenção"
                            ? "border-amber-100 bg-amber-50 text-amber-700"
                            : item.usefulLifeStatus === "Troca antecipada"
                              ? "border-red-100 bg-red-50 text-red-700"
                              : "border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.usefulLifeStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou CA..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-600">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 font-semibold">
              <tr>
                <th className="px-6 py-4">Nome do Equipamento</th>
                <th className="px-6 py-4">CA</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Custo Unit.</th>
                <th className="px-6 py-4">Estoque</th>
                <th className="px-6 py-4">Estoque Min.</th>
                <th className="px-6 py-4">Vida Útil</th>
                {canEditPPEs && (
                  <th className="px-6 py-4 text-right">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPPEs.map((ppe) => {
                const minimumStock = getPpeMinimumStock(ppe);
                const usefulLifeDays = getPpeUsefulLifeDays(ppe);
                const isLowStock = ppe.stockQuantity <= minimumStock;

                return (
                  <tr
                    key={ppe.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isLowStock ? "bg-red-50/40" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {isLowStock && (
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{ppe.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{ppe.ca}</td>
                    <td className="px-6 py-4">{ppe.description}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {formatCurrency(getPpeUnitCost(ppe))}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          isLowStock
                            ? "bg-red-50 text-red-700 border-red-100"
                            : ppe.stockQuantity <= minimumStock * 1.5
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        }`}
                      >
                        {ppe.stockQuantity} un
                      </span>
                    </td>
                    <td className="px-6 py-4">{minimumStock} un</td>
                    <td className="px-6 py-4">{usefulLifeDays} dias</td>
                    {canEditPPEs && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(ppe)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(ppe.id)}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredPPEs.length === 0 && (
                <tr>
                  <td
                    colSpan={canEditPPEs ? 8 : 7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <HardHat className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-900">
                        Nenhum item encontrado no estoque de EPIs
                      </p>
                      <p className="text-sm">
                        Ajuste sua busca ou cadastre um novo equipamento.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? "Editar EPI" : "Novo EPI"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="sr-only">Fechar</span>
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nome do Equipamento
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite o nome do EPI"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  CA (Certificado de Aprovação)
                </label>
                <input
                  type="text"
                  required
                  value={formData.ca}
                  onChange={(e) =>
                    setFormData({ ...formData, ca: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Digite o CA"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Descrição{" "}
                  <span className="font-normal text-slate-400">(opcional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Detalhes do equipamento..."
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Custo unitário estimado
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.unitCost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitCost: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Estoque mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.minimumStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minimumStock: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Vida útil estimada (dias)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.usefulLifeDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usefulLifeDays: parseInt(e.target.value, 10) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Quantidade em Estoque
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.stockQuantity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stockQuantity: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-200 transition-all disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving && (
                    <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  {isSaving ? "Salvando..." : "Salvar EPI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
