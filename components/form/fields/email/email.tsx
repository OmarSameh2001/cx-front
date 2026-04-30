"use client";

import { Mail } from "lucide-react";

export default function EmailField() {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-border w-fit pb-1">
      <Mail className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground italic">
        name@example.com
      </span>
    </div>
  );
}
