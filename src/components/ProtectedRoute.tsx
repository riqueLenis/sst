import { ShieldCheck } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function ProtectedRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-4xl items-center justify-center">
          <div className="panel max-w-xl text-center">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-linear-to-br from-teal-500 to-sky-600 text-white shadow-lg shadow-sky-200/50">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <p className="eyebrow mt-6">Sessão segura</p>
            <h1 className="panel-title mt-2">Validando seu acesso ao sistema</h1>
            <p className="panel-copy mt-3">
              Aguarde enquanto confirmamos a sessão ativa antes de liberar os módulos operacionais.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}