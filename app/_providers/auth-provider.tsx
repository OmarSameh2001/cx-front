"use client";
import { UserResponse } from "@/dto/auth/login";
import { createContext, useContext, useEffect, useState } from "react";

type AuthState = {
    user: Omit<UserResponse, 'permissions'> | null;
    permissions: Record<string, true>;
    isAdmin: boolean;
    loading: boolean;
    setAuth: (permissions: Record<string, true>, user: Omit<UserResponse, 'permissions'>) => void;
    clearAuth: () => void;
};

const AuthContext = createContext<AuthState>({
    user: null,
    permissions: {},
    isAdmin: false,
    loading: true,
    setAuth: () => {},
    clearAuth: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<Omit<UserResponse, 'permissions'> | null>(null);
    const [permissions, setPermissions] = useState<Record<string, true>>({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        try {
            const p = localStorage.getItem('permissions');
            const u = localStorage.getItem('user');
            if (p) setPermissions(JSON.parse(p));
            if (u) {
                const parsed = JSON.parse(u);
                setUser(parsed);
                setIsAdmin(parsed.role?.toLowerCase() === 'admin');
            }
        } catch {
            localStorage.removeItem('permissions');
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    }, []);

    function setAuth(perms: Record<string, true>, userData: Omit<UserResponse, 'permissions'>) {
        localStorage.setItem('permissions', JSON.stringify(perms));
        localStorage.setItem('user', JSON.stringify(userData));
        setPermissions(perms);
        setUser(userData);
        setIsAdmin(userData.role?.toLowerCase() === 'admin');
    }

    function clearAuth() {
        localStorage.removeItem('permissions');
        localStorage.removeItem('user');
        setPermissions({});
        setUser(null);
        setIsAdmin(false);
    }

    return (
        <AuthContext.Provider value={{ user, permissions, isAdmin, loading, setAuth, clearAuth }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
