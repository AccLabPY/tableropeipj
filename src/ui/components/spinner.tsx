import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Spinner sutil para estados de envío (botones, overlays). */
export function Spinner({ className }: { className?: string }) {
  return (
    <Loader2
      className={cn("h-4 w-4 animate-spin", className)}
      aria-hidden="true"
    />
  );
}
