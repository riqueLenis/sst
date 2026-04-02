import React, { useState } from "react";
import { useAppContext } from "../store/AppContext";
import { Plus, ShieldCheck, FileText, Download, Search } from "lucide-react";
import { createPdfDocument, exportTableToPDF } from "../lib/pdfUtils";

export default function PPEDeliveries() {
  const {
    ppeDeliveries,
    employees,
    ppes,
    companies,
    addPPEDelivery,
    updatePPEDelivery,
  } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const initialFormState = {
    employeeId: "",
    ppeId: "",
    quantity: 1,
    deliveryDate: new Date().toISOString().split("T")[0],
    reason: "Substituição",
    status: "delivered" as const,
  };
  const [formData, setFormData] = useState(initialFormState);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPPEDelivery(formData);
    setIsModalOpen(false);
    setFormData(initialFormState);
  };

  const handleReturn = (id: string) => {
    if (window.confirm("Confirmar devolução deste EPI?")) {
      updatePPEDelivery(id, {
        status: "returned",
        returnDate: new Date().toISOString().split("T")[0],
      });
    }
  };

  const generatePDF = (delivery: any) => {
    void (async () => {
      const employee = employees.find((e) => e.id === delivery.employeeId);
      const ppe = ppes.find((p) => p.id === delivery.ppeId);
      const company = companies.find((c) => c.id === employee?.companyId);

      if (!employee || !ppe || !company) return;

      const { doc, autoTable } = await createPdfDocument();

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42);
      doc.text("Ficha de Entrega de EPI", 105, 20, { align: "center" });

      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.text(`Empresa: ${company.name}`, 14, 40);
      doc.text(`CNPJ: ${company.cnpj}`, 14, 48);

      doc.text(`Colaborador: ${employee.name}`, 14, 60);
      doc.text(`CPF: ${employee.cpf}`, 14, 68);
      doc.text(
        `Data de Admissão: ${new Date(employee.admissionDate).toLocaleDateString("pt-BR")}`,
        14,
        76,
      );

      autoTable(doc, {
        startY: 90,
        head: [["EPI", "CA", "Qtd", "Data Entrega", "Motivo"]],
        body: [
          [
            ppe.name,
            ppe.ca,
            delivery.quantity.toString(),
            new Date(delivery.deliveryDate).toLocaleDateString("pt-BR"),
            delivery.reason,
          ],
        ],
        theme: "grid",
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
        },
        styles: { fontSize: 10, cellPadding: 5 },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 120;
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      const declarationText = `Declaro ter recebido da empresa ${company.name} os Equipamentos de Proteção Individual (EPI) constantes nesta ficha, comprometendo-me a usá-los apenas para a finalidade a que se destinam, responsabilizando-me por sua guarda e conservação, e a comunicar qualquer alteração que os torne impróprios para uso.`;

      const splitText = doc.splitTextToSize(declarationText, 180);
      doc.text(splitText, 14, finalY + 20);

      doc.setDrawColor(203, 213, 225);
      doc.line(40, finalY + 70, 170, finalY + 70);
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Assinatura do Colaborador: ${employee.name}`,
        105,
        finalY + 78,
        {
          align: "center",
        },
      );

      doc.save(
        `Ficha_EPI_${employee.name.replace(/\s+/g, "_")}_${delivery.deliveryDate}.pdf`,
      );
    })();
  };

  const handleExportListPDF = () => {
    const columns = ["Data", "Colaborador", "EPI", "Qtd", "Motivo", "Status"];
    const data = filteredDeliveries.map((d) => {
      const employee = employees.find((e) => e.id === d.employeeId);
      const ppe = ppes.find((p) => p.id === d.ppeId);
      return [
        new Date(d.deliveryDate).toLocaleDateString("pt-BR"),
        employee?.name || "N/A",
        ppe?.name || "N/A",
        d.quantity.toString(),
        d.reason,
        d.status === "delivered"
          ? "Entregue"
          : d.status === "returned"
            ? "Devolvido"
            : "Extraviado",
      ];
    });
    exportTableToPDF(
      "Relatório de Entregas de EPI",
      columns,
      data,
      "entregas_epis_sst_pro",
    );
  };

  const filteredDeliveries = ppeDeliveries.filter((d) => {
    const employee = employees.find((e) => e.id === d.employeeId);
    const ppe = ppes.find((p) => p.id === d.ppeId);
    const searchLower = searchTerm.toLowerCase();

    return (
      employee?.name.toLowerCase().includes(searchLower) ||
      ppe?.name.toLowerCase().includes(searchLower) ||
      d.reason.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            Entregas de EPI
          </h1>
          <p className="text-slate-500 mt-1">
            Registre e acompanhe as entregas de equipamentos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportListPDF}
            disabled={ppeDeliveries.length === 0}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm h-10 px-4 py-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Lista (PDF)
          </button>
          <button
            onClick={() => {
              setFormData({
                ...initialFormState,
                employeeId: employees[0]?.id || "",
                ppeId: ppes[0]?.id || "",
              });
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 h-10 px-4 py-2"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Entrega
          </button>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por colaborador, EPI ou motivo..."
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
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Colaborador</th>
                <th className="px-6 py-4">EPI</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Motivo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDeliveries.map((delivery) => {
                const employee = employees.find(
                  (e) => e.id === delivery.employeeId,
                );
                const ppe = ppes.find((p) => p.id === delivery.ppeId);

                return (
                  <tr
                    key={delivery.id}
                    className="bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {new Date(delivery.deliveryDate).toLocaleDateString(
                        "pt-BR",
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {employee?.name || "Não encontrado"}
                    </td>
                    <td className="px-6 py-4">
                      {ppe?.name || "Não encontrado"}
                    </td>
                    <td className="px-6 py-4">{delivery.quantity}</td>
                    <td className="px-6 py-4">{delivery.reason}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          delivery.status === "delivered"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : delivery.status === "returned"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-red-50 text-red-700 border-red-100"
                        }`}
                      >
                        {delivery.status === "delivered"
                          ? "Entregue"
                          : delivery.status === "returned"
                            ? "Devolvido"
                            : "Extraviado"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => generatePDF(delivery)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Gerar Ficha (PDF)"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        {delivery.status === "delivered" && (
                          <button
                            onClick={() => handleReturn(delivery.id)}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-lg transition-colors"
                          >
                            Devolver
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDeliveries.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <ShieldCheck className="w-12 h-12 text-slate-300 mb-3" />
                      <p className="text-base font-medium text-slate-900">
                        Nenhuma entrega encontrada
                      </p>
                      <p className="text-sm">
                        Ajuste sua busca ou registre uma nova entrega.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="my-6 bg-white rounded-2xl shadow-xl w-full max-h-[calc(100vh-2rem)] max-w-md overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-slate-50/90 backdrop-blur-sm z-10">
              <h3 className="text-lg font-bold text-slate-900">
                Registrar Entrega de EPI
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
                  Colaborador
                </label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) =>
                    setFormData({ ...formData, employeeId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um colaborador
                  </option>
                  {employees
                    .filter((e) => e.status === "active")
                    .map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  EPI
                </label>
                <select
                  required
                  value={formData.ppeId}
                  onChange={(e) =>
                    setFormData({ ...formData, ppeId: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="" disabled>
                    Selecione um EPI
                  </option>
                  {ppes
                    .filter((p) => p.stockQuantity > 0)
                    .map((ppe) => (
                      <option key={ppe.id} value={ppe.id}>
                        {ppe.name} (CA: {ppe.ca}) - Estoque: {ppe.stockQuantity}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Data da Entrega
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, deliveryDate: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Motivo
                </label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                >
                  <option value="Admissão">Admissão</option>
                  <option value="Substituição">Substituição</option>
                  <option value="Perda/Extravio">Perda/Extravio</option>
                  <option value="Dano">Dano</option>
                  <option value="Validade">Validade</option>
                </select>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 pt-4 border-t border-slate-100 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!formData.employeeId || !formData.ppeId}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Registrar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
