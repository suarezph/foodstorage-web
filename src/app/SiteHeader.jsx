import { PanelLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb.jsx';
import { Button } from '../components/ui/button.jsx';
import { Separator } from '../components/ui/separator.jsx';
import { useSidebar } from '../components/ui/sidebar.jsx';
import { NAV_GROUPS, pageFor } from './nav.js';

function PageCrumbs() {
  const { pathname } = useLocation();
  const page = pageFor(pathname);
  const group = NAV_GROUPS.find((g) => g.id === page?.group);
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden sm:inline-flex">
          {group?.label ?? 'Food Storage'}
        </BreadcrumbItem>
        {page && (
          <>
            <BreadcrumbSeparator className="hidden sm:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{page.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/** shadcn sidebar-16 sticky header: sidebar toggle and breadcrumb. */
export function SiteHeader() {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const expanded = isMobile ? openMobile : open;
  return (
    <header className="sticky top-0 z-50 flex w-full items-center border-b bg-background">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="size-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          aria-label={expanded ? 'Hide menu' : 'Show menu'}
          aria-expanded={expanded}
        >
          <PanelLeft aria-hidden="true" />
        </Button>
        <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
        <PageCrumbs />
      </div>
    </header>
  );
}
