export const AuthValidator = {
    email(value: string): string | undefined {
        if (!value.trim()) return "Email is required.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Please enter a valid email address.";
    },

    password(value: string): string | undefined {
        if (!value) return "Password is required.";
        if (value.length < 8) return "Password must be at least 8 characters.";
    },
};
