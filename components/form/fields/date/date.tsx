"use client";

import { Calendar } from "lucide-react";

export default function DateField() {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-border w-fit pb-1">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground italic">
        Month, day, year
      </span>
    </div>
  );
}
