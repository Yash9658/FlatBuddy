import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionLabel,
}: SectionHeadingProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="flex max-w-2xl flex-col gap-3">
        <span className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">{eyebrow}</span>
        <div className="flex flex-col gap-2">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
          <p className="text-base leading-7 text-muted-foreground">{description}</p>
        </div>
      </div>
      {actionLabel ? (
        <Button variant="outline">
          {actionLabel}
          <ArrowRight data-icon="inline-end" />
        </Button>
      ) : null}
    </div>
  );
}
