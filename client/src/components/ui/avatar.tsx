import { cn } from "@/lib/utils";

type AvatarProps = {
  src?: string;
  alt: string;
  fallback: string;
  className?: string;
};

export function Avatar({ src, alt, fallback, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex size-12 items-center justify-center overflow-hidden rounded-2xl bg-secondary text-sm font-semibold text-secondary-foreground",
        className,
      )}
    >
      {src ? <img src={src} alt={alt} className="size-full object-cover" /> : <span>{fallback}</span>}
    </div>
  );
}
