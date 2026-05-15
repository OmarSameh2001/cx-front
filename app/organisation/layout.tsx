import { ProtectedRoute } from "@/components/protection/authentication";

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <ProtectedRoute>
            {children}
        </ProtectedRoute>
    );
}
