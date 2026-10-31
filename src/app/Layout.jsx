import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarInset, SidebarProvider } from '../components/ui/sidebar.jsx';
import { TooltipProvider } from '../components/ui/tooltip.jsx';
import { AppSidebar } from './AppSidebar.jsx';
import { SiteHeader } from './SiteHeader.jsx';

export { NAV } from './nav.js';

// Sidebar open/closed is a per-browser preference: localStorage, never a cookie.
const KEY = 'foodstorage.sidebar';
function readOpen() {
  try {
    return localStorage.getItem(KEY) !== 'closed';
  } catch {
    return true;
  }
}

/** App shell (shadcn sidebar-16): sticky site header on top, sidebar below it, page on the right. */
export function Layout() {
  const [open, setOpen] = useState(readOpen);
  const onOpenChange = (next) => {
    setOpen(next);
    try {
      localStorage.setItem(KEY, next ? 'open' : 'closed');
    } catch {
      // Private mode or blocked storage: the preference just isn't remembered.
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="[--header-height:calc(--spacing(14))]">
        <SidebarProvider open={open} onOpenChange={onOpenChange} className="flex flex-col">
          <SiteHeader />
          <div className="flex flex-1">
            <AppSidebar />
            {/* SidebarInset renders the page's <main>. */}
            <SidebarInset>
              <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
                <Outlet />
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
    </TooltipProvider>
  );
}
