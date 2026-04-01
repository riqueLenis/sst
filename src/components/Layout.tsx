import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  Users,
  HardHat,
  ShieldCheck,
  LayoutDashboard,
  Menu,
  X,
  Briefcase,
  DollarSign,
  FileSignature,
  Stethoscope,
} from "lucide-react";
import { cn } from "../lib/utils";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Empresas", path: "/empresas", icon: Building2 },
  { name: "Setores & Cargos", path: "/setores", icon: Briefcase },
  { name: "Colaboradores", path: "/colaboradores", icon: Users },
  { name: "EPIs", path: "/epis", icon: HardHat },
  { name: "Entregas de EPI", path: "/entregas", icon: ShieldCheck },
  { name: "Saúde Ocupacional", path: "/saude", icon: Stethoscope },
  { name: "Programas e Laudos", path: "/programas", icon: FileSignature },
  { name: "Financeiro", path: "/financeiro", icon: DollarSign },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 shadow-sm",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between h-20 px-6 border-b border-slate-100">
          <span className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-sm shadow-blue-200">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            SST Pro
          </span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="p-4 space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              (item.path !== "/" && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-blue-600" : "text-slate-400",
                  )}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm h-20 flex items-center px-4 sm:px-8 z-10 sticky top-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-slate-500 hover:text-slate-700 mr-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition-colors border border-transparent hover:border-slate-200">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm flex items-center justify-center text-white font-bold text-sm">
                AD
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-700 leading-tight">
                  Admin
                </p>
                <p className="text-xs text-slate-500">Gestor SST</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
