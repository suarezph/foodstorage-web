import { cn } from 'cn';

/**
 * The Food Storage mark: a fridge, black on orange. Same drawing as public/favicon.svg; colours
 * come from the --brand tokens so it never changes with the theme.
 */
export function BrandMark({ className }) {
  return (
    <span
      className={cn(
        'flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground',
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        className="size-[85%]"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="19" y="10" width="26" height="44" rx="4" />
        <path d="M19 28h26M25 17v5M25 34v8" />
      </svg>
    </span>
  );
}
