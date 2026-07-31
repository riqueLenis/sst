import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import { brand } from "./lib/brand";
import { AuthProvider } from "./store/AuthContext";
import { AppProvider } from "./store/AppContext";
import { useAuth } from "./store/AuthContext";
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Companies = lazy(() => import("./pages/Companies"));
const Sectors = lazy(() => import("./pages/Sectors"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
const PPEs = lazy(() => import("./pages/PPEs"));
const PPEDeliveries = lazy(() => import("./pages/PPEDeliveries"));
const PPEDeliveryDetail = lazy(() => import("./pages/PPEDeliveryDetail"));
const Returns = lazy(() => import("./pages/Returns"));
const Financial = lazy(() => import("./pages/Financial"));
const Programs = lazy(() => import("./pages/Programs"));
const OccupationalHealth = lazy(() => import("./pages/OccupationalHealth"));
const AccessManagement = lazy(() => import("./pages/AccessManagement"));
const Login = lazy(() => import("./pages/Login"));

function AppFallback() {
  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl gap-6 lg:min-h-[calc(100vh-3rem)]">
        <div className="hidden w-78 shrink-0 rounded-4xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-slate-900/30 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-[#2cb897]/25 to-[#163e70]/35 text-white">
              <img src={brand.iconSrc} alt="" className="h-6 w-6 object-contain" />
            </div>
            <div className="h-3 w-32 rounded-full bg-white/15" />
            <div className="mt-3 h-7 w-44 rounded-full bg-white/10" />
            <div className="mt-3 h-16 rounded-2xl bg-white/8" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 rounded-2xl bg-white/8" />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/60 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 rounded-2xl bg-slate-100 animate-pulse" />
              <div className="flex-1 space-y-3">
                <div className="h-3 w-28 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-8 w-48 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-3 w-full max-w-xl rounded-full bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-40 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/50 animate-pulse"
              />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="h-80 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/50 animate-pulse" />
            <div className="h-80 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-lg shadow-slate-200/50 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AppHome() {
  const { user } = useAuth();

  if (user?.role === "technician") {
    return <Navigate to="/epis" replace />;
  }

  return <Dashboard />;
}

export default function App() {
  const ProtectedApp = () => (
    <AppProvider>
      <Layout />
    </AppProvider>
  );

  return (
    <ErrorBoundary fullPage title="Não foi possível carregar o sistema">
      <AuthProvider>
        <Router>
          <Suspense fallback={<AppFallback />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<ProtectedApp />}>
                  <Route index element={<AppHome />} />
                  <Route path="epis" element={<PPEs />} />
                  <Route path="entregas" element={<PPEDeliveries />} />
                  <Route path="entregas/:id" element={<PPEDeliveryDetail />} />
                  <Route path="devolucoes" element={<Returns />} />
                  <Route
                    element={
                      <ProtectedRoute allowedRoles={["admin"]} redirectTo="/" />
                    }
                  >
                    <Route path="acessos" element={<AccessManagement />} />
                  </Route>
                  <Route
                    element={
                      <ProtectedRoute
                        allowedRoles={["admin", "manager"]}
                        redirectTo="/epis"
                      />
                    }
                  >
                    <Route path="empresas" element={<Companies />} />
                    <Route path="setores" element={<Sectors />} />
                    <Route path="colaboradores" element={<Employees />} />
                    <Route
                      path="colaboradores/:id"
                      element={<EmployeeProfile />}
                    />
                    <Route path="saude" element={<OccupationalHealth />} />
                    <Route path="programas" element={<Programs />} />
                    <Route path="financeiro" element={<Financial />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
