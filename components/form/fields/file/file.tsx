"use client";

import { UploadCloud } from "lucide-react";

export default function FileField() {
  return (
    <div className="border-2 border-dashed border-border rounded-md p-6 flex flex-col items-center justify-center gap-2 bg-muted/30 hover:bg-muted/50 transition cursor-pointer">
      <UploadCloud className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm text-foreground font-medium">
        Click to upload or drag and drop
      </p>
      <p className="text-xs text-muted-foreground">
        Any file type up to 10 MB
      </p>
    </div>
  );
}
