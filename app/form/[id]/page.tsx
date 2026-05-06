"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function FormEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="flex-1 min-h-screen bg-muted/40">
      <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col gap-4">
        <Link
          href="/form"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to forms
        </Link>
        <div className="rounded-lg bg-card text-card-foreground border border-border shadow-sm p-10 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Edit form #{id}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Edit page coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
