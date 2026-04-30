"use client"
import { AtSign, BrainCircuit, Building, ChartColumn, Form, UserRound, Workflow } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "../../theme-toggle/theme";

type icon = React.ReactNode;
type NavItem =
    | { label: string; href: string; children?: never; icon?: icon }
    | { label: string; href?: never; children: { label: string; href: string; icon?: icon }[]; icon?: icon };

const navItems: NavItem[] = [
    {
        label: "Form",
        icon: <Form />,
        children: [
            { label: "View", href: "/form" },
            { label: "Create", href: "/form" },
        ],
    },
    { label: "Mentions", href: "/mentions", icon: <AtSign /> },
    { label: "Visualisation", href: "/visualisation", icon: <ChartColumn /> },
    {
        label: "Workflow",
        icon: <Workflow />,
        children: [
            { label: "Existing", href: "/workflow/existing" },
            { label: "Create", href: "/workflow/create" },
        ],
    },
    { label: "Vision Intelligence", href: "/vision-intelligence", icon: <BrainCircuit /> },
    { label: "Organisation", href: "/organisation", icon: <Building /> },
];

export default function SideBar() {
    return (
        <div className="flex h-screen flex-col justify-between border-e border-border bg-background text-foreground max-w-xs">
            <div className="px-1 sm:px-4 py-3 sm:py-6 flex flex-col justify-center items-center">
                <Link href="/" className="flex flex-col sm:flex-row h-10 sm:w-32 gap-2 justify-center items-center rounded-lg bg-background/500 text-xs text-foreground">
                    <UserRound />
                    <span className="font-bold hidden sm:inline">User Experience</span>
                    <span className="font-bold inline sm:hidden">UX</span>
                </Link>
                <ThemeToggle />

                <ul className="mt-6 space-y-1">
                    {navItems.map((item) =>
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
                                    className="block rounded-lg px-2 py-2 text-sm font-medium flex items-center gap-2"
                                >
                                    {item.icon} <span className="hidden sm:inline">{item.label}</span>
                                </Link>
                            </li>
                        )
                    )}
                </ul>
            </div>

            {/* <div className="sticky inset-x-0 bottom-0 border-t border-gray-100">
                <Link href="#" className="flex items-center gap-2 bg-white p-4 hover:bg-gray-50">
                    <img
                        alt=""
                        src="https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&q=80&w=1160"
                        className="size-10 rounded-full object-cover"
                    />
                    <div>
                        <p className="text-xs">
                            <strong className="block font-medium">Eric Frusciante</strong>
                            <span>eric@frusciante.com</span>
                        </p>
                    </div>
                </Link>
            </div> */}
        </div>
    );
}
