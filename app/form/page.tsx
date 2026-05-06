"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

export default function FormListPage() {
  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Forms</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and create forms.
            </p>
          </div>
          <Link
            href="/form/create"
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 shadow-sm text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Create form
          </Link>
        </header>

        <section className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-10 text-center text-sm text-muted-foreground">
          Forms list will appear here.
        </section>
      </div>
    </div>
  );
}
