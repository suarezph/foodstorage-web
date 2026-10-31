import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext.jsx';
import { AuthShell } from './AuthShell.jsx';
import { ChangePasswordForm } from './ChangePasswordForm.jsx';

/** Shown right after signing in with a temporary password, before anything else is reachable. */
export function ChangePasswordPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user?.mustChangePassword) return <Navigate to="/" replace />;
  return (
    <AuthShell
      title="Choose your own password"
      subtitle="You signed in with a temporary password. Set a new one to continue."
      footer={
        <button type="button" onClick={logout} className="underline">
          Sign out
        </button>
      }
    >
      <ChangePasswordForm
        currentLabel="Temporary password"
        onDone={() => navigate('/', { replace: true })}
      />
    </AuthShell>
  );
}
