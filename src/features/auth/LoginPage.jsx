import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '../../app/AuthContext.jsx';
import { Button, ErrorNotice, Field, Input } from '../../components/ui/index.jsx';
import { AuthShell } from './AuthShell.jsx';

const schema = z.object({
  username: z.string().trim().min(1, 'Enter your username'),
  password: z.string().min(1, 'Enter your password'),
});

export function LoginPage() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { username: '', password: '' } });

  // Go back to where the person was headed (a deep link), not always home.
  const destination = location.state?.from ?? '/';
  if (status === 'authed') return <Navigate to={destination} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      const user = await login(values);
      navigate(user.mustChangePassword ? '/change-password' : destination, { replace: true });
    } catch (err) {
      setServerError(err);
    }
  };

  return (
    <AuthShell
      title="UseFirst"
      subtitle="Sign in with the username you were given."
      footer="Accounts are made by the person who manages UseFirst. There is no sign-up."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
        {serverError && <ErrorNotice error={serverError} />}
        <Field label="Username" error={errors.username?.message}>
          {(p) => (
            <Input
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
              {...p}
              {...register('username')}
            />
          )}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(p) => (
            <Input
              type="password"
              autoComplete="current-password"
              {...p}
              {...register('password')}
            />
          )}
        </Field>
        <Button type="submit" className="w-full" loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthShell>
  );
}
