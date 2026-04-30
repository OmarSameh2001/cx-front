"use client";

import { Phone } from "lucide-react";

export default function PhoneField() {
  return (
    <div className="flex items-center gap-2 border-b border-dashed border-border w-fit pb-1">
      <Phone className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground italic">
        +1 (555) 000-0000
      </span>
    </div>
  );
}
