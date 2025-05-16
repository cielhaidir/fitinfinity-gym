import { useSession } from "next-auth/react";

export function useRBAC() {
  const { data: session } = useSession();
  const hasPermission = (permissionName: string): boolean => {
    if (!session?.user?.permissions) return false;
    return session.user.permissions.includes(permissionName);
  };

  const hasRole = (roleName: string): boolean => {
    if (!session?.user?.roles) return false;
    return session.user.roles.includes(roleName);
  };

  return {
    hasPermission,
    hasRole,
    userPermissions: session?.user?.permissions || [],
    userRoles: session?.user?.roles || [],
    isLoading: !session
  };
}