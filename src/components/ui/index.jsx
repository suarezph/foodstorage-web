/*
 * Food Storage's app-level UI kit (copied from Basemint), built on shadcn/ui (the files next to this one). Feature code
 * imports from here; the shadcn files stay close to upstream so `npx shadcn add` can update them.
 */
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from 'cn';
import { useId } from 'react';
import { Alert, AlertDescription } from './alert.jsx';
import { Button as ShadButton } from './button.jsx';
import { Card as ShadCard } from './card.jsx';
import {
  Dialog as ShadDialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './dialog.jsx';
import { Input as ShadInput } from './input.jsx';
import { Label } from './label.jsx';

// Kit variant names → shadcn variants.
const VARIANTS = {
  primary: 'default',
  secondary: 'outline',
  danger: 'destructive',
  ghost: 'ghost',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <ShadButton
      type={type}
      variant={VARIANTS[variant] ?? variant}
      size={size === 'sm' ? 'sm' : 'default'}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
      {children}
    </ShadButton>
  );
}

/** A padded card for page sections. */
export function Card({ className, children, ...props }) {
  return (
    <ShadCard className={cn('gap-0 p-5', className)} {...props}>
      {children}
    </ShadCard>
  );
}

/** Label + control + error, wired together for screen readers. */
export function Field({ label, error, hint, children }) {
  const id = useId();
  const describedBy = [error && `${id}-err`, hint && `${id}-hint`].filter(Boolean).join(' ');
  return (
    // content-start: in a row next to a taller field (one with a hint), the label and box stay at
    // the top instead of spreading out, so boxes in a row line up.
    <div className="grid content-start gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = ShadInput;

/** Native <select> styled like shadcn's Input: accessible, and works with react-hook-form. */
export function Select({ className, children, ...props }) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] md:text-sm dark:bg-input/30',
        // Our own chevron (src/index.css) with room around it; the browser's sits on the edge.
        'appearance-none bg-no-repeat pr-9 bg-[length:1rem] bg-[position:right_0.75rem_center]',
        'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        '[&>option]:bg-popover [&>option]:text-popover-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

/** Modal dialog (Radix): focus trap, Esc to close and an overlay. */
export function Dialog({ open, onClose, title, description, children }) {
  return (
    <ShadDialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Radix warns without a description; keep one for screen readers. */}
          <DialogDescription className={description ? undefined : 'sr-only'}>
            {description ?? title}
          </DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </ShadDialog>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div role="status" className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}…
    </div>
  );
}

export function ErrorNotice({ error, onRetry, children }) {
  return (
    <Alert variant="destructive" role="alert">
      <AlertCircle aria-hidden="true" />
      <AlertDescription className="space-y-2">
        <p>{error?.message ?? 'Something went wrong.'}</p>
        {children}
        {onRetry && (
          <Button size="sm" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ title, children }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-2 text-sm text-muted-foreground">{children}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
