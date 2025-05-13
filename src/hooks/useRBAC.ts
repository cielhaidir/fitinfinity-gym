import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";

export function useRBAC() {
  const { data: session } = useSession();
  const { data: userWithRoles } = api.user.getUserWithRoles.useQuery(
    undefined,
    { enabled: !!session?.user?.id }
  );

  const hasPermission = (permissionName: string): boolean => {
    if (!userWithRoles) return false;
    
    // Check if user has the permission through any of their roles
    return userWithRoles.roles.some(role => 
      role.permissions.some(perm => perm.permission.name === permissionName)
    );
  };

  const hasRole = (roleName: string): boolean => {
    if (!userWithRoles) return false;
    
    // Check if user has the specified role
    return userWithRoles.roles.some(role => role.name === roleName);
  };

  return {
    hasPermission,
    hasRole,
    userRoles: userWithRoles?.roles || [],
    isLoading: !userWithRoles,
  };
}