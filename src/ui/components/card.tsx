import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-pj border border-linea bg-superficie shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  meta,
}: {
  title: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between border-b border-linea-2 px-4 py-3">
      <h3 className="text-[12.5px] font-semibold tracking-wide">{title}</h3>
      {meta ? <span className="text-[11px] text-muted-2">{meta}</span> : null}
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-4", className)}>{children}</div>;
}

/** Tag/chip neutro (ej. "OE3"). */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-pj-sm border border-linea bg-sem-gris-bg px-[7px] py-[2px] text-2xs text-muted">
      {children}
    </span>
  );
}
