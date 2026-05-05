"use client";
import { useAuth } from "@/app/_providers/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.replace('/');
    }, [loading, user, router]);

    if (loading || !user) return null;
    return <>{children}</>;
}

export function UnProtectedRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) router.replace('/');
    }, [loading, user, router]);

    if (loading || user) return null;
    return <>{children}</>;
}
