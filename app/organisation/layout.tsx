import { ProtectedRoute } from "@/components/protection/authentication";
import { AuthGuard } from "@/components/protection/authorization";

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            <AuthGuard permission="organisations:read">
                {children}
            </AuthGuard>
        </ProtectedRoute>
    );
}
