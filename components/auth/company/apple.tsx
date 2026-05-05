'use client'

export default function AppleLoginButton() {
    return (
        <button
            type="button"
            className="flex cursor-pointer items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground border border-border hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.74 3.17.8 1.21-.24 2.37-.93 3.67-.84 1.57.12 2.75.72 3.51 1.88-3.22 1.93-2.46 6.17.65 7.36-.61 1.55-1.41 3.08-3 3.68zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Apple
        </button>
    )
}
