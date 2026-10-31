import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EmptyState, Spinner } from '../components/ui/index.jsx';
import { AdminPage } from '../features/admin/AdminPage.jsx';
import { ChangePasswordPage } from '../features/auth/ChangePasswordPage.jsx';
import { LoginPage } from '../features/auth/LoginPage.jsx';
import { HomePage } from '../features/home/HomePage.jsx';
import { HouseholdPage } from '../features/household/HouseholdPage.jsx';
import { MedicinePage } from '../features/medicine/MedicinePage.jsx';
import { WastePage } from '../features/reports/WastePage.jsx';
import { SettingsPage } from '../features/settings/SettingsPage.jsx';
import { ShoppingPage } from '../features/shopping/ShoppingPage.jsx';
import { FreezerPage } from '../features/stock/FreezerPage.jsx';
import { StoragePage } from '../features/stock/StoragePage.jsx';
import { can } from '../lib/food.js';
import { useAuth } from './AuthContext.jsx';

// The app shell (sidebar, menus) is only needed after sign-in, so the login page stays small.
const Layout = lazy(() => import('./Layout.jsx').then((m) => ({ default: m.Layout })));

function RequireAuth({ children, allowTemporaryPassword = false }) {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Restoring your session" />;
  if (status === 'anon')
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  // A temporary password must be replaced before anything else is reachable.
  if (user.mustChangePassword && !allowTemporaryPassword)
    return <Navigate to="/change-password" replace />;
  return children;
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  return user.role === 'admin' ? children : <Navigate to="/" replace />;
}

/** Medicine is not for viewers (young children); the API refuses them too (ADR 0008). */
function RequireMember({ children }) {
  const { user } = useAuth();
  return can(user, 'member') ? children : <Navigate to="/" replace />;
}

/** Food pages need a household. An admin without one is sent to set one up. */
function RequireHousehold({ children }) {
  const { user } = useAuth();
  if (user.household) return children;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  return (
    <EmptyState title="You are not in a household yet">
      Ask the person who manages UseFirst to add you to your household.
    </EmptyState>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/change-password"
        element={
          <RequireAuth allowTemporaryPassword>
            <ChangePasswordPage />
          </RequireAuth>
        }
      />
      <Route
        element={
          <RequireAuth>
            <Suspense fallback={<Spinner label="Loading" />}>
              <Layout />
            </Suspense>
          </RequireAuth>
        }
      >
        <Route
          path="/"
          element={
            <RequireHousehold>
              <HomePage />
            </RequireHousehold>
          }
        />
        <Route
          path="/storage"
          element={
            <RequireHousehold>
              <StoragePage />
            </RequireHousehold>
          }
        />
        {[
          ['/freezer', FreezerPage],
          ['/shopping', ShoppingPage],
          ['/waste', WastePage],
        ].map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <RequireHousehold>
                <Page />
              </RequireHousehold>
            }
          />
        ))}
        <Route
          path="/medicine"
          element={
            <RequireHousehold>
              <RequireMember>
                <MedicinePage />
              </RequireMember>
            </RequireHousehold>
          }
        />
        <Route
          path="/household"
          element={
            <RequireHousehold>
              <HouseholdPage />
            </RequireHousehold>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
