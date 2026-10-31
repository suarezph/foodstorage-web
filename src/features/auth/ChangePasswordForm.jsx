import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAuth } from '../../app/AuthContext.jsx';
import { Button, ErrorNotice, Field, Input } from '../../components/ui/index.jsx';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters (a few random words works well)')
      .max(128, 'Use at most 128 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password different from the current one',
  });

/** Used on the forced change-password page and in Settings. Other sessions are signed out. */
export function ChangePasswordForm({ onDone, currentLabel = 'Current password' }) {
  const { changePassword } = useAuth();
  const [serverError, setServerError] = useState(null);
  const [changed, setChanged] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setServerError(null);
    setChanged(false);
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      setChanged(true);
      onDone?.();
    } catch (err) {
      setServerError(err);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <ErrorNotice error={serverError} />}
      {changed && (
        <p role="status" className="text-sm text-positive">
          Password changed. Your other sessions were signed out.
        </p>
      )}
      <Field label={currentLabel} error={errors.currentPassword?.message}>
        {(p) => (
          <Input
            type="password"
            autoComplete="current-password"
            {...p}
            {...register('currentPassword')}
          />
        )}
      </Field>
      <Field
        label="New password"
        error={errors.newPassword?.message}
        hint="At least 10 characters. A few random words are easy to type and hard to guess."
      >
        {(p) => (
          <Input type="password" autoComplete="new-password" {...p} {...register('newPassword')} />
        )}
      </Field>
      <Field label="Confirm new password" error={errors.confirm?.message}>
        {(p) => (
          <Input type="password" autoComplete="new-password" {...p} {...register('confirm')} />
        )}
      </Field>
      <Button type="submit" loading={isSubmitting}>
        Change password
      </Button>
    </form>
  );
}
