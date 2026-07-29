import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { UserRole } from "../types";
import { useAuth } from "../store/AuthContext";

type ProtectedRouteProps = {
  allowedRoles?: UserRole[];
  redirectTo?: string;
};

export default function ProtectedRoute({
  allowedRoles,
  redirectTo = "/",
}: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, user } = useAuth();

  // Enquanto a sessão é verificada, vamos direto ao login (sem tela de espera).
  // Se o usuário já estiver autenticado, a própria tela de login o encaminha
  // de volta ao destino assim que a verificação termina.
  if (isLoading || !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
}