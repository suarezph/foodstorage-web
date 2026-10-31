import {
  ChartColumn,
  House,
  Refrigerator,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Snowflake,
  Users,
} from 'lucide-react';

/** Sidebar groups, in order. A group shows when one of its pages is visible to you. */
export const NAV_GROUPS = [
  { id: 'food', label: 'Food' },
  { id: 'admin', label: 'Admin' },
];

/**
 * Every page in the app shell; the sidebar and breadcrumb read this list. `household: true` pages
 * need a household; `adminOnly` pages need the admin role.
 */
export const NAV = [
  { to: '/', label: 'Home', icon: House, group: 'food', household: true },
  { to: '/storage', label: 'Storage', icon: Refrigerator, group: 'food', household: true },
  { to: '/freezer', label: 'Freezer', icon: Snowflake, group: 'food', household: true },
  { to: '/shopping', label: 'Shopping list', icon: ShoppingCart, group: 'food', household: true },
  { to: '/waste', label: 'Waste', icon: ChartColumn, group: 'food', household: true },
  { to: '/household', label: 'Household', icon: Users, group: 'food', household: true },
  {
    to: '/admin',
    label: 'Households & people',
    icon: ShieldCheck,
    group: 'admin',
    adminOnly: true,
  },
  { to: '/settings', label: 'Settings', icon: Settings, group: 'footer' },
];

/** The page a path belongs to. */
export const pageFor = (pathname) =>
  NAV.find((n) =>
    n.to === '/' ? pathname === '/' : pathname === n.to || pathname.startsWith(`${n.to}/`),
  );

export const visibleNav = (user) =>
  NAV.filter(
    (n) => (!n.adminOnly || user?.role === 'admin') && (!n.household || Boolean(user?.household)),
  );
