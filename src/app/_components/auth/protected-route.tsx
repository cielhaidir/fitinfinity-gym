"use client";

import { useRouter } from "next/navigation";
import { useRBAC } from "@/hooks/useRBAC";
import { ReactNode, useEffect } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export function ProtectedRoute({ 
  children, 
  requiredPermissions = [], 
  requiredRoles = [] 
}: ProtectedRouteProps) {
  const router = useRouter();
  const { hasPermission, hasRole, isLoading } = useRBAC();

  useEffect(() => {
    if (isLoading) return;

    const hasRequiredPermissions = requiredPermissions.length === 0 || 
      requiredPermissions.some(permission => hasPermission(permission));
    
    const hasRequiredRoles = requiredRoles.length === 0 || 
      requiredRoles.some(role => hasRole(role));

    if (!hasRequiredPermissions || !hasRequiredRoles) {
      router.push("/unauthorized");
    }
  }, [hasPermission, hasRole, isLoading, requiredPermissions, requiredRoles, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}