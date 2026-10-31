import { NavLink, useLocation } from 'react-router-dom';
import { BrandMark } from '../components/brand.jsx';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../components/ui/sidebar.jsx';
import { useAuth } from './AuthContext.jsx';
import { NAV_GROUPS, pageFor, visibleNav } from './nav.js';
import { NavUser } from './NavUser.jsx';

function NavItem({ item }) {
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={pageFor(pathname)?.to === item.to} tooltip={item.label}>
        <NavLink to={item.to} onClick={() => setOpenMobile(false)}>
          <Icon aria-hidden="true" />
          <span>{item.label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/** shadcn sidebar-16: sits under the sticky site header. */
export function AppSidebar(props) {
  const { user } = useAuth();
  const items = visibleNav(user);
  // A group shows when you can see one of its pages (Admin is for admins only).
  const groups = NAV_GROUPS.filter((g) => items.some((i) => i.group === g.id));
  const footer = items.filter((i) => i.group === 'footer');

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]!" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to={user.household ? '/' : '/settings'}>
                <BrandMark />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.household?.name ?? 'UseFirst'}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.household ? 'UseFirst' : 'No household yet'}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main" className="contents">
          {groups.map((g) => (
            <SidebarGroup key={g.id}>
              <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {items
                  .filter((i) => i.group === g.id)
                  .map((item) => (
                    <NavItem key={item.to} item={item} />
                  ))}
              </SidebarMenu>
            </SidebarGroup>
          ))}
          <SidebarGroup className="mt-auto">
            <SidebarGroupContent>
              <SidebarMenu>
                {footer.map((item) => (
                  <NavItem key={item.to} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </nav>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
