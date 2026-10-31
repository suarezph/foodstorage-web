import { useAuth } from '../../app/AuthContext.jsx';
import { Button, Card, PageHeader, Select } from '../../components/ui/index.jsx';
import { ROLE_LABEL } from '../../lib/food.js';
import { useTheme } from '../../lib/theme.js';
import { ChangePasswordForm } from '../auth/ChangePasswordForm.jsx';
import { NotificationsCard } from './NotificationsCard.jsx';

/** Your account, notifications, password and appearance. */
export function SettingsPage() {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useTheme();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="font-semibold">You</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user.name}</dd>
            <dt className="text-muted-foreground">Username</dt>
            <dd>{user.username}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd>{user.email ?? 'None yet (ask the administrator)'}</dd>
            <dt className="text-muted-foreground">Household</dt>
            <dd>
              {user.household
                ? `${user.household.name} (${ROLE_LABEL[user.householdRole]})`
                : 'None yet'}
            </dd>
          </dl>
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        </Card>
        <Card className="space-y-2">
          <h2 className="font-semibold">Appearance</h2>
          <label htmlFor="theme" className="text-sm">
            Theme
          </label>
          <Select id="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="system">Same as this device</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Card>
        {user.household && <NotificationsCard />}
        <Card className={user.household ? '' : 'lg:col-span-2'}>
          <h2 className="mb-3 font-semibold">Password</h2>
          <div className="max-w-md">
            <ChangePasswordForm />
          </div>
        </Card>
      </div>
    </>
  );
}
