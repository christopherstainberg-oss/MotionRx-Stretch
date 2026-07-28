import { cn, toTitleCase } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="section-label">{toTitleCase(eyebrow)}</p> : null}
        <h1 className="section-title">{toTitleCase(title)}</h1>
        {description ? (
          <p className="section-sub max-w-xl">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
