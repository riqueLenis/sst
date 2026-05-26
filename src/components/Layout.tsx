import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BellDot,
  Briefcase,
  Building2,
  ChevronRight,
  Command,
  DollarSign,
  FileSignature,
  HardHat,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  type LucideIcon,
  Users,
  X,
} from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { brand } from "../lib/brand";
import { cn } from "../lib/utils";
import { useAppContext } from "../store/AppContext";
import { useAuth } from "../store/AuthContext";

type NavItem = {
  name: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

const navItems: NavItem[] = [
  {
    name: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    description: "Indicadores e visão executiva.",
  },
  {
    name: "Empresas",
    path: "/empresas",
    icon: Building2,
    description: "Base de clientes e contatos.",
  },
  {
    name: "Setores & Cargos",
    path: "/setores",
    icon: Briefcase,
    description: "Estrutura operacional e funções.",
  },
  {
    name: "Colaboradores",
    path: "/colaboradores",
    icon: Users,
    description: "Gestão de vínculos e histórico.",
  },
  {
    name: "Estoque de EPIs",
    path: "/epis",
    icon: HardHat,
    description: "Catálogo, vínculos por cargo e estoque.",
  },
  {
    name: "Entregas de EPI",
    path: "/entregas",
    icon: ShieldCheck,
    description: "Entrega, devolução e ficha.",
  },
  {
    name: "Saúde Ocupacional",
    path: "/saude",
    icon: Stethoscope,
    description: "ASOs, afastamentos e encaminhamentos.",
  },
  {
    name: "Programas e Laudos",
    path: "/programas",
    icon: FileSignature,
    description: "PGR, LTCAT e vigências.",
  },
  {
    name: "Financeiro",
    path: "/financeiro",
    icon: DollarSign,
    description: "Receitas, despesas e faturamento.",
  },
  {
    name: "Acessos",
    path: "/acessos",
    icon: KeyRound,
    description: "Gestão de logins e perfis administrativos.",
  },
];

function getRouteContext(pathname: string) {
  if (pathname.startsWith("/colaboradores/")) {
    return {
      section: "Pessoas",
      label: "Perfil do colaborador",
      description:
        "Consulta individual com dados cadastrais, vínculo e histórico completo de EPIs.",
    };
  }

  if (pathname.startsWith("/entregas/")) {
    return {
      section: "Entregas de EPI",
      label: "Detalhe da entrega",
      description:
        "Conferência do registro, assinatura digital do colaborador e ficha operacional da entrega.",
    };
  }

  const currentItem = navItems.find(
    (item) =>
      pathname === item.path ||
      (item.path !== "/" && pathname.startsWith(item.path)),
  );

  return {
    section: currentItem ? "Módulo ativo" : "Plataforma EXIN",
    label: currentItem?.name ?? brand.platformName,
    description:
      currentItem?.description ??
      brand.shortDescription,
  };
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const location = useLocation();
  const { logout, token, user } = useAuth();
  const {
    error: appError,
    isLoading: isAppLoading,
    refreshData,
  } = useAppContext();
  const isTechnician = user?.role === "technician";
  const visibleNavItems = useMemo(() => {
    if (user?.role === "admin") {
      return navItems;
    }

    if (user?.role === "manager") {
      return navItems.filter((item) => item.path !== "/acessos");
    }

    return navItems.filter(
      (item) => item.path === "/epis" || item.path === "/entregas",
    );
  }, [user?.role]);
  const visibleMobileNavItems = useMemo(() => {
    if (isTechnician) {
      return visibleNavItems;
    }

    return navItems.filter((item) =>
      ["/", "/empresas", "/colaboradores", "/epis"].includes(item.path),
    );
  }, [isTechnician, visibleNavItems]);
  const routeContext = useMemo(
    () => getRouteContext(location.pathname),
    [location.pathname],
  );
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
      }).format(new Date()),
    [],
  );
  const userInitials = useMemo(() => {
    if (!user?.name) {
      return "EX";
    }

    return user.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }, [user?.name]);

  const userRoleLabel = useMemo(() => {
    const roleMap = {
      admin: "Administrador",
      manager: "Gestor",
      technician: "Técnico",
    } as const;

    return user?.role ? roleMap[user.role] : "Sessão ativa";
  }, [user?.role]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }

    setIsLoggingOut(true);

    try {
      if (token) {
        await apiClient.post("/api/auth/logout", undefined, {
          token,
        });
      }
    } catch {
      // The local session must still be cleared even if the API request fails.
    }

    logout();
  };

  return (
    <div className="app-shell">
      <div
        className={cn("app-backdrop", sidebarOpen && "app-backdrop-visible")}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={cn(
          "app-sidebar transform transition-transform duration-300 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-[110%]",
        )}
      >
        <div className="app-sidebar-inner">
          <div className="flex items-start justify-between gap-4">
            <div className="sidebar-brand">
              <span className="brand-mark" aria-hidden="true">
                <img
                  src={brand.iconSrc}
                  alt=""
                  className="brand-icon-image"
                />
              </span>
              <div className="sidebar-expandable sidebar-brand-copy">
                <img
                  src={brand.logoSrc}
                  alt={brand.fullName}
                  className="brand-logo"
                />
                <p className="brand-copy">{brand.sidebarDescription}</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(false)}
              className="app-icon-button lg:hidden"
              type="button"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="sidebar-expandable-block">
            <div className="sidebar-note">
              <div>
                <span className="sidebar-note-label">Ambiente online</span>
                <p className="sidebar-note-title">
                  Operação EXIN pronta para campo e escritório
                </p>
                <p className="sidebar-note-copy">
                  Identidade visual atualizada com foco nas rotinas mais
                  importantes da operação.
                </p>
              </div>
              <Sparkles className="sidebar-note-icon h-5 w-5" />
            </div>
          </div>

          <nav className="app-nav">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                aria-label={item.name}
                title={item.name}
                className={({ isActive }) =>
                  cn("nav-link", isActive && "nav-link-active")
                }
              >
                <item.icon className="nav-link-icon h-5 w-5" />
                <span className="nav-link-copy sidebar-expandable">
                  <span className="nav-link-title">{item.name}</span>
                  <span className="nav-link-description">
                    {item.description}
                  </span>
                </span>
              </NavLink>
            ))}

            <div className="mt-auto pt-3">
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className={cn(
                  "nav-link w-full text-left",
                  isLoggingOut && "pointer-events-none opacity-70",
                )}
                aria-label="Sair do sistema"
                title="Encerrar sessão"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <LoaderCircle className="nav-link-icon h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="nav-link-icon h-5 w-5" />
                )}
                <span className="nav-link-copy sidebar-expandable">
                  <span className="nav-link-title">
                    {isLoggingOut ? "Saindo..." : "Sair"}
                  </span>
                  <span className="nav-link-description">
                    Encerra a sessão atual com segurança.
                  </span>
                </span>
              </button>
            </div>
          </nav>

          <div className="sidebar-expandable-block">
            <div className="sidebar-footer">
              <p className="sidebar-footer-title">Gestão integrada EXIN</p>
              <p className="sidebar-footer-copy">
                Empresas, pessoas, saúde ocupacional, programas e financeiro em
                uma navegação única e alinhada à nova identidade.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <div className="app-main-inner">
          <header className="app-header">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="app-menu-button lg:hidden"
                type="button"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0 flex-1">
                <p className="app-header-trail">
                  <span>{routeContext.section}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  <span className="text-slate-500">{routeContext.label}</span>
                </p>
                <h2 className="app-header-title truncate">
                  {routeContext.label}
                </h2>
                <p className="app-header-copy">{routeContext.description}</p>
              </div>
            </div>

            <div className="app-header-actions">
              <div className="app-date-chip hidden md:inline-flex">
                <Command className="h-4 w-4" />
                {formattedDate}
              </div>

              <button
                className="app-icon-button"
                type="button"
                aria-label="Notificações"
              >
                <BellDot className="h-5 w-5" />
              </button>

              <div className="header-user-card">
                <div className="header-user-avatar bg-linear-to-br from-teal-600 to-sky-600">
                  {userInitials}
                </div>
                <div className="hidden sm:block">
                  <p className="header-user-name">{user?.name ?? "Operador"}</p>
                  <p className="header-user-role">{userRoleLabel}</p>
                </div>
              </div>

              <button
                className={cn(
                  "app-icon-button",
                  isLoggingOut && "pointer-events-none opacity-70",
                )}
                type="button"
                aria-label={isLoggingOut ? "Encerrando sessão" : "Sair"}
                onClick={() => {
                  void handleLogout();
                }}
                title={isLoggingOut ? "Encerrando sessão" : "Encerrar sessão"}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </button>
            </div>
          </header>

          <main className="app-content">
            <div className="app-content-inner">
              {isAppLoading ? (
                <div className="panel max-w-3xl">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-3xl bg-linear-to-br from-[#2cb897] to-[#163e70] text-white shadow-lg shadow-[#163e70]/25">
                    <LoaderCircle className="h-6 w-6 animate-spin" />
                  </div>
                  <p className="eyebrow mt-6">Sincronização inicial</p>
                  <h1 className="panel-title mt-2">Carregando dados da operação</h1>
                  <p className="panel-copy mt-3 max-w-2xl">
                    Estamos conectando o frontend ao backend autenticado para montar o estado central da aplicação.
                  </p>
                </div>
              ) : appError ? (
                <div className="panel max-w-3xl">
                  <p className="eyebrow">Falha de conexão</p>
                  <h1 className="panel-title mt-2">Não foi possível sincronizar o sistema</h1>
                  <p className="panel-copy mt-3 max-w-2xl">{appError}</p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        void refreshData();
                      }}
                    >
                      Tentar novamente
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={logout}
                    >
                      Encerrar sessão
                    </button>
                  </div>
                </div>
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </div>

        <nav className="mobile-nav lg:hidden" aria-label="Navegação rápida">
          {visibleMobileNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn("mobile-nav-item", isActive && "mobile-nav-item-active")
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            className={cn(
              "mobile-nav-item",
              sidebarOpen && "mobile-nav-item-active",
            )}
          >
            {sidebarOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
