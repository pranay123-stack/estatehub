import Link from "next/link";
import clsx from "clsx";

/** Compact metric tile used across all three dashboard variants. */
export function StatCard({
  label,
  value,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  href?: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const tones = {
    neutral: "text-ink",
    warning: "text-amber-600",
    success: "text-emerald-600",
  } as const;

  const body = (
    <>
      <p className={clsx("text-2xl font-bold tracking-tight", tones[tone])}>{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </>
  );

  const className =
    "rounded-card border border-line bg-surface p-4 shadow-card transition-shadow" +
    (href ? " hover:shadow-card-hover" : "");

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
