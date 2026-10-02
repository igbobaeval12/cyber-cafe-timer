import { useAuth } from "@/_core/hooks/useAuth";
import { hasPermission } from "@/lib/staffPermissions";
import { useLocation } from "wouter";
import { ReactNode, useEffect } from "react";

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRole?: "admin" | "super_admin" | "user";
  allowedRoles?: string[];
  requiredPermission?: string;
};

function AccessDenied() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-slate-600 mb-6">You don't have permission to access this page.</p>
        <a href="/" className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Go Home
        </a>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRole, allowedRoles, requiredPermission }: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const userPermissions = (user as any)?.permissions ?? [];
  const authStateReady = !loading && user !== undefined;

  const isAdminUser = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (!authStateReady) return;
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }
  }, [authStateReady, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-slate-500">Checking session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Check role-based access (backward compatibility)
  const hasRequiredRole = requiredRole === "admin"
    ? isAdminUser
    : !requiredRole || user?.role === requiredRole;

  if (requiredRole && !hasRequiredRole) {
    return <AccessDenied />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role ?? "")) {
    return <AccessDenied />;
  }

  if (requiredPermission && !isAdminUser) {
    if (!hasPermission({ permissions: userPermissions, role: user?.role }, requiredPermission)) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
