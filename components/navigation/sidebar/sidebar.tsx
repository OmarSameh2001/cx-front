"use client"
import { AtSign, BrainCircuit, Building, ChartColumn, Form, LogOut, UserCog, UserLock, UserRound, UserStar, Workflow } from "lucide-react";
import { AuthService } from "@/services/auth/auth";
import Link from "next/link";
import { useAuth } from "@/app/_providers/auth-provider";
import { ThemeToggle } from "../../theme-toggle/theme";

type icon = React.ReactNode;
type NavItem =
    | { label: string; href: string; children?: never; icon?: icon; permission: string }
    | { label: string; href?: never; permission?: string; children: { label: string; href: string; icon?: icon }[]; icon?: icon };

const navItems: NavItem[] = [
    {
        label: "Form",
        icon: <Form />,
        href: "/form",
        permission: "forms",
        // children: [
        //     { label: "View", href: "/form" },
        //     { label: "Create", href: "/form" },
        // ],
    },
    { label: "Mentions", permission: "mentions", href: "/mentions", icon: <AtSign /> },
    { label: "Visualisation", permission: "visualisation", href: "/visualisation", icon: <ChartColumn /> },
    {
        label: "Workflow",
        icon: <Workflow />,
        href: "/workflow",
        permission: "workflows",
        // children: [
        //     { label: "Existing", href: "/workflow/existing" },
        //     { label: "Create", href: "/workflow/create" },
        // ],
    },
    { label: "Vision Intelligence", permission: "vision-intelligence", href: "/vision-intelligence", icon: <BrainCircuit /> },
    { label: "Organisation", permission: "organisations", href: "/organisation", icon: <Building /> },
    { label: "Customers", permission: "customers", href: "/customers", icon: <UserStar /> },
    { label: "Employees", permission: "employees", href: "/employees", icon: <UserCog /> },
    { label: "Roles", permission: "roles", href: "/roles-and-permissions", icon: <UserLock /> },
];

const authService = new AuthService();

export default function SideBar() {
    const { permissions, isAdmin, user, loading, clearAuth } = useAuth();

    const hasPermission = (permission: string) =>
        isAdmin || Object.keys(permissions).some(k => k.startsWith(permission + ':'));

    async function handleLogout() {
        await authService.logout();
        clearAuth();
    }

    
    return (
        <div className="flex h-screen flex-col justify-between border-e border-border bg-background text-foreground max-w-xs">
            <div className="px-1 sm:px-4 py-3 sm:py-6 flex flex-col justify-center items-center">
                <Link href="/" className="flex flex-col sm:flex-row h-10 sm:w-32 gap-2 justify-center items-center rounded-lg bg-background/500 text-xs text-foreground">
                    <UserRound />
                    <span className="font-bold hidden sm:inline">User Experience</span>
                    <span className="font-bold inline sm:hidden">UX</span>
                </Link>
                <ThemeToggle />

                {!loading && user?.id && (<ul className="mt-6 space-y-1">
                    {navItems.filter(item => !item.permission || hasPermission(item.permission)).map((item) =>
                        item.children ? (
                            <li key={item.label}>
                                <details className="group [&_summary::-webkit-details-marker]:hidden">
                                    <summary className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2">
                                        <span className="text-sm font-medium flex items-center gap-2">{item.icon}
                                            <span className="hidden sm:inline">{item.label}</span></span>
                                        <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                    </summary>
                                    <ul className="space-y-1 px-2">
                                        {item.children.map((child) => (
                                            <li key={child.label}>
                                                <Link
                                                    href={child.href}
                                                    className="block rounded-lg px-6 py-2 text-sm font-medium"
                                                >
                                                    {child.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </details>
                            </li>
                        ) : (
                            <li key={item.label}>
                                <Link
                                    href={item.href}
                                    title={item.label}
                                    className="block rounded-lg px-2 py-2 text-sm font-medium flex items-center gap-2"
                                >
                                    {item.icon} <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            </li>
                        )
                    )}
                </ul>)}
                {!loading && user?.id && (
                <div className="px-1 sm:px-4 py-3 sm:py-6 border-t border-border">
                    <ul className="space-y-1">
                        <li>
                            <button onClick={handleLogout} className="w-full block rounded-lg px-2 py-2 text-sm font-medium flex items-center gap-2 text-destructive">
                                <LogOut /> <span className="hidden sm:inline">Logout</span>
                            </button>
                        </li>
                    </ul>
                </div>
                )}
                {!loading && !user?.id && (
                <div className="px-1 sm:px-4 py-3 sm:py-6 border-t border-border">
                    <ul className="space-y-1">
                        <li>
                            <Link href="/login" className="block rounded-lg px-2 py-2 text-sm font-medium flex items-center gap-2">
                                <UserRound /> <span className="hidden sm:inline">Login</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/register" className="block rounded-lg px-2 py-2 text-sm font-medium flex items-center gap-2">
                                <UserRound /> <span className="hidden sm:inline">Register</span>
                            </Link>
                        </li>
                    </ul>
                </div>
            )}
            </div>

            
        </div>
    );
}
