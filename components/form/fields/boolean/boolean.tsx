"use client";

import { Circle } from "lucide-react";

export default function BooleanField() {
  return (
    <div className="flex flex-col gap-2">
      {["Yes", "No"].map((label) => (
        <div key={label} className="flex items-center gap-3">
          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}
