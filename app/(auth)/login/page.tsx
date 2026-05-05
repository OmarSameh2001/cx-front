'use client'

import AppleLoginButton from "@/components/auth/company/apple";
import GoogleLoginButton from "@/components/auth/company/google";
import MicrosoftLoginButton from "@/components/auth/company/microsoft";
import { useAuth } from "@/app/_providers/auth-provider";
import { AuthService } from "@/services/auth/auth";
import { AuthValidator } from "@/utils/validator/auth";
import { useState } from "react";

const authService = new AuthService();

export default function LoginForm() {

    const { setAuth } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState<string | undefined>();
    const [passwordError, setPasswordError] = useState<string | undefined>();
    const [serverError, setServerError] = useState<string | undefined>();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        const eErr = AuthValidator.email(email);
        const pErr = AuthValidator.password(password);
        setEmailError(eErr);
        setPasswordError(pErr);

        if (eErr || pErr) return;

        setServerError(undefined);

        try {
            const response = await authService.employeeLogin(email, password);
            const { permissions, ...user } = response.user;
            const permissionsMap = Object.fromEntries(permissions.map(p => [p, true])) as Record<string, true>;
            setAuth(permissionsMap, user);
        } catch {
            setServerError('Invalid credentials. Please try again.');
        }
    }

    return (
        <div className="flex min-h-full min-w-6/12 flex-col justify-center">
            <form onSubmit={handleSubmit}>
                <div className="space-y-12">
                    <div className="border-b border-border pb-12">
                        <h2 className="text-base/7 font-semibold text-foreground">Welcome to Customer Experience</h2>
                        <p className="mt-1 text-sm/6 text-muted-foreground">Please Enter your credintials.</p>

                        <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">

                            <div className="sm:col-span-4">
                                <label htmlFor="email" className="block text-sm/6 font-medium text-foreground">
                                    Email address
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        onChange={(e) => setEmail(e.target.value)}
                                        value={email}
                                        className="block w-full rounded-md bg-background border border-input px-3 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                                    />
                                </div>
                                {emailError && (
                                    <p className="mt-1 text-sm text-destructive">{emailError}</p>
                                )}
                            </div>

                            <div className="col-span-4">
                                <label htmlFor="password" className="block text-sm/6 font-medium text-foreground">
                                    Password
                                </label>
                                <div className="mt-2">
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        autoComplete="current-password"
                                        onChange={(e) => setPassword(e.target.value)}
                                        value={password}
                                        className="block w-full rounded-md bg-background border border-input px-3 py-1.5 text-base text-foreground placeholder:text-muted-foreground focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6"
                                    />
                                </div>
                                {passwordError && (
                                    <p className="mt-1 text-sm text-destructive">{passwordError}</p>
                                )}
                            </div>

                        </div>

                        {serverError && (
                            <p className="mt-4 text-sm text-destructive">{serverError}</p>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-x-6 border-b border-border pb-6">
                    <button
                        type="submit"
                        className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Login
                    </button>
                </div>

                <div className="mt-6">
                    <div className="relative flex items-center gap-4 mb-4">
                        <div className="flex-1 border-t border-border" />
                        <span className="text-sm text-muted-foreground shrink-0">Or continue with</span>
                        <div className="flex-1 border-t border-border" />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <GoogleLoginButton />
                        <AppleLoginButton />
                        <MicrosoftLoginButton />
                    </div>
                </div>
            </form>
        </div>
    );
}
