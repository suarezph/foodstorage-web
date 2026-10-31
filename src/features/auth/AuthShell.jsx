import { BrandMark } from '../../components/brand.jsx';

/** Centered, card-less auth layout (shadcn login-05): mark, title, subtitle, form, footer. */
export function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandMark className="size-12 rounded-xl" />
          <span className="sr-only">Food Storage</span>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
        {footer && (
          <p className="px-6 text-center text-sm text-balance text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_button]:underline [&_button]:underline-offset-4">
            {footer}
          </p>
        )}
      </div>
    </div>
  );
}
