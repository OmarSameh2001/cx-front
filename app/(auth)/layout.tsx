import { UnProtectedRoute } from "@/components/protection/authentication";

export default function layout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-center min-h-screen w-full pt-10">
            <UnProtectedRoute>{children}</UnProtectedRoute>
        </div>
    );
}