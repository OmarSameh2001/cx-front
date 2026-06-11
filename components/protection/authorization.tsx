"use client";
import { useAuth } from "@/app/_providers/auth-provider";
import { AccessDenied } from "@/components/auth/access-denied";

type Props = {
    permission: string;
    children: React.ReactNode;
};

export function AuthGuard({ permission, children }: Props) {
    const { permissions, isAdmin, loading } = useAuth();

    if (loading) return null;

    const hasPermission = isAdmin || !!permissions[permission];
    if (!hasPermission) return <AccessDenied />;
    return <>{children}</>;
}

export function PermissionGate({ permission, children }: Props) {
    const { permissions, isAdmin } = useAuth();
    const hasPermission = isAdmin || !!permissions[permission];

    if (!hasPermission) return null;
    return <>{children}</>;
}
