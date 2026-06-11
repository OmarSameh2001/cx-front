"use client";
import { FileQuestion } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter();

    return (
        <div className="min-h-screen flex-1 flex items-center justify-center bg-background px-4">
            <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted text-muted-foreground">
                    <FileQuestion className="w-8 h-8" />
                </div>
                <div className="flex flex-col gap-2">
                    <h1 className="text-2xl font-semibold text-foreground">Page Not Found</h1>
                    <p className="text-sm text-muted-foreground">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={() => router.back()}
                        className="flex-1 px-4 py-2 rounded-md border border-border text-foreground text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
                    >
                        Go Back
                    </button>
                    <button
                        onClick={() => router.push("/")}
                        className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        </div>
    );
}
