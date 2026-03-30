import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Building2, Users, DollarSign, BarChart3, UserSearch, Calendar, Bell, FileText, StickyNote,
  ChevronLeft, ChevronRight, ChevronDown, Menu, Info, Car, KeyRound, DoorOpen, Megaphone, Home, Settings, ArrowLeftRight, Brush, Wallet, ClipboardList, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/sonner';
import { getNotifications, markNotificationRead, deleteNotification } from '@/lib/api';

import PropertiesPage from '@/pages/PropertiesPage';
import UnitsPage from '@/pages/UnitsPage';
import TenantsPage from '@/pages/TenantsPage';
import LeadsPage from '@/pages/LeadsPage';
import IncomePage from '@/pages/IncomePage';
import VacancyPage from '@/pages/VacancyPage';
import CalendarPage from '@/pages/CalendarPage';
import FeaturesPage from '@/pages/FeaturesPage';
import NotesPage from '@/pages/NotesPage';
import NotificationsPage from '@/pages/NotificationsPage';
import ParkingPage from '@/pages/ParkingPage';
import DoorCodesPage from '@/pages/DoorCodesPage';
import LoginInfoPage from '@/pages/LoginInfoPage';
import MarketingPage from '@/pages/MarketingPage';
import MoveInOutPage from '@/pages/MoveInOutPage';
import HousekeepingPage from '@/pages/HousekeepingPage';
import MaintenancePage from '@/pages/MaintenancePage';
import DepositsPage from '@/pages/DepositsPage';
import RentTrackingPage from '@/pages/RentTrackingPage';

export const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

const NAV_ITEMS = [
  {
    label: 'Properties', icon: Building2, path: '/', testId: 'sidebar-nav-properties-group', isGroup: true,
    children: [
      { path: '/', label: 'Properties', icon: Building2, testId: 'sidebar-nav-properties' },
      { path: '/units', label: 'Units', icon: Home, testId: 'sidebar-nav-units' },
    ]
  },
  {
    label: 'Tenants', icon: Users, path: '/tenants', testId: 'sidebar-nav-tenants-group', isGroup: true,
    children: [
      { path: '/tenants', label: 'Tenants', icon: Users, testId: 'sidebar-nav-tenants' },
      { path: '/leads', label: 'Leads', icon: UserSearch, testId: 'sidebar-nav-leads' },
    ]
  },
  {
    label: 'Calendar', icon: Calendar, path: '/calendar', testId: 'sidebar-nav-calendar-group', isGroup: true,
    children: [
      { path: '/calendar', label: 'Calendar', icon: Calendar, testId: 'sidebar-nav-calendar' },
      { path: '/vacancy', label: 'Vacancy', icon: BarChart3, testId: 'sidebar-nav-vacancies' },
    ]
  },
  {
    label: 'Budgeting', icon: DollarSign, path: '/budgeting/income', testId: 'sidebar-nav-budgeting', isGroup: true,
    children: [
      { path: '/budgeting/income', label: 'Income', icon: DollarSign, testId: 'sidebar-nav-income' },
      { path: '/budgeting/deposits', label: 'Deposits', icon: Wallet, testId: 'sidebar-nav-deposits' },
      { path: '/budgeting/rent-tracking', label: 'Rent Tracking', icon: ClipboardList, testId: 'sidebar-nav-rent-tracking' },
    ]
  },
  { path: '/notes', label: 'Notes', icon: StickyNote, testId: 'sidebar-nav-notes' },
  {
    label: 'Info', icon: Info, path: '/info/parking', testId: 'sidebar-nav-info', isGroup: true,
    children: [
      { path: '/info/parking', label: 'Parking', icon: Car, testId: 'sidebar-nav-parking' },
      { path: '/info/login-info', label: 'Login Info', icon: KeyRound, testId: 'sidebar-nav-login-info' },
      { path: '/info/door-codes', label: 'Door Codes', icon: DoorOpen, testId: 'sidebar-nav-door-codes' },
      { path: '/info/marketing', label: 'Marketing', icon: Megaphone, testId: 'sidebar-nav-marketing' },
    ]
  },
  {
    label: 'Operations', icon: Settings, path: '/ops/move-in-out', testId: 'sidebar-nav-operations', isGroup: true,
    children: [
      { path: '/ops/move-in-out', label: 'Move In / Out', icon: ArrowLeftRight, testId: 'sidebar-nav-move-in-out' },
      { path: '/ops/housekeeping', label: 'Housekeeping', icon: Brush, testId: 'sidebar-nav-housekeeping' },
      { path: '/ops/maintenance', label: 'Maintenance', icon: Wrench, testId: 'sidebar-nav-maintenance' },
    ]
  },
  { path: '/notifications', label: 'Notifications', icon: Bell, testId: 'sidebar-nav-notifications' },
  { path: '/features', label: 'Features', icon: FileText, testId: 'sidebar-nav-features' },
];

function NotificationPanel({ notifications, onRefresh }) {
  const handleMarkRead = async (id) => { await markNotificationRead(id); onRefresh(); };
  const handleDelete = async (id) => { await deleteNotification(id); onRefresh(); };

  const active = notifications.filter(n => !n.is_read && (n.status === 'upcoming' || n.status === 'in_progress' || !n.status));
  const viewed = notifications.filter(n => n.is_read || (n.status && n.status !== 'upcoming' && n.status !== 'in_progress'));

  return (
    <div className="flex flex-col h-full" data-testid="notifications-panel">
      <div className="px-1 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active ({active.length})</h3>
        {active.length === 0 && <p className="text-sm text-muted-foreground mt-2">No active notifications</p>}
        {active.map(n => (
          <div key={n.id} className="mt-2 p-3 rounded-lg border bg-sky-50 border-sky-200" data-testid="notifications-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{n.name || `${n.lead_name || ''} ${n.stage_name ? '- ' + n.stage_name : ''}`}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.message || n.notes || ''}</p>
                <p className="text-xs text-muted-foreground">Due: {n.reminder_date || n.notification_date || 'N/A'}</p>
              </div>
              <div className="flex gap-1 ml-2">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleMarkRead(n.id)}>Mark Read</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => handleDelete(n.id)}>Delete</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-1 pt-4 border-t">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Viewed ({viewed.length})</h3>
        {viewed.length === 0 && <p className="text-sm text-muted-foreground mt-2">No viewed notifications</p>}
        {viewed.slice(0, 20).map(n => (
          <div key={n.id} className="mt-2 p-3 rounded-lg border bg-muted/30" data-testid="notifications-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{n.name || `${n.lead_name || ''} ${n.stage_name ? '- ' + n.stage_name : ''}`}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.message || n.notes || ''}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-2" onClick={() => handleDelete(n.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NavItem({ item, collapsed, isActive, onClick }) {
  return (
    <NavLink to={item.path} data-testid={item.testId} onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
        ${isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}
        ${collapsed ? 'justify-center px-2' : ''}`}
    >
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}

function NavGroup({ item, collapsed, location, onClick }) {
  const isChildActive = item.children?.some(c => c.path === '/' ? location.pathname === '/' : location.pathname.startsWith(c.path));
  const [open, setOpen] = useState(isChildActive);

  useEffect(() => { if (isChildActive) setOpen(true); }, [isChildActive]);

  if (collapsed) {
    return item.children?.map(child => {
      const active = location.pathname.startsWith(child.path);
      return <NavItem key={child.path} item={child} collapsed isActive={active} onClick={onClick} />;
    });
  }

  return (
    <div>
      <div className={`flex items-center rounded-lg text-sm font-medium transition-colors
        ${isChildActive ? 'text-accent-foreground' : 'text-muted-foreground'}`}>
        <NavLink
          to={item.path}
          onClick={onClick}
          data-testid={item.testId}
          className={({ isActive: navActive }) =>
            `flex items-center gap-3 flex-1 min-w-0 px-3 py-2.5 rounded-l-lg transition-colors
            ${isChildActive ? 'text-accent-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`
          }
        >
          <item.icon className="h-5 w-5 flex-shrink-0" />
          <span className="flex-1 text-left truncate">{item.label}</span>
        </NavLink>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
          className="px-2 py-2.5 rounded-r-lg hover:bg-muted/60 transition-colors"
          aria-label="Toggle menu"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
      </div>
      {open && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
          {item.children.map(child => {
            const active = child.path === '/' ? location.pathname === '/' : location.pathname.startsWith(child.path);
            return <NavItem key={child.path} item={child} collapsed={false} isActive={active} onClick={onClick} />;
          })}
        </div>
      )}
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  return (
    <aside className={`hidden lg:flex flex-col bg-card border-r border-border/70 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[272px]'}`}>
      <div className="flex items-center h-16 px-4 border-b border-border/70">
        {!collapsed && <h1 className="font-heading text-lg font-bold text-primary tracking-tight">Furnished Rentals</h1>}
        <Button variant="ghost" size="sm" className={`${collapsed ? 'mx-auto' : 'ml-auto'} h-8 w-8`} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map((item, idx) => {
            if (item.isGroup) return <NavGroup key={idx} item={item} collapsed={collapsed} location={location} />;
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isActive} />;
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}

function MobileNav() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9"><Menu className="h-5 w-5" /></Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[272px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="font-heading text-lg font-bold text-primary">Furnished Rentals</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map((item, idx) => {
            if (item.isGroup) return <NavGroup key={idx} item={item} collapsed={false} location={location} onClick={() => setOpen(false)} />;
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return <NavItem key={item.path} item={item} collapsed={false} isActive={isActive} onClick={() => setOpen(false)} />;
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}

function AppShell({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const refreshNotifications = useCallback(async () => {
    try { const data = await getNotifications(); setNotifications(data); }
    catch (e) { console.error('Failed to fetch notifications', e); }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read && (n.status === 'upcoming' || n.status === 'in_progress' || !n.status)).length;

  return (
    <NotificationContext.Provider value={{ notifications, refreshNotifications }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center h-16 px-4 sm:px-6 border-b border-border/70 bg-card/80 backdrop-blur-md z-30">
            <MobileNav />
            <div className="flex-1" />
            <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-9 w-9" data-testid="topbar-notifications-button">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[400px] sm:w-[450px]">
                <SheetHeader><SheetTitle className="font-heading">Notifications</SheetTitle></SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-4">
                  <NotificationPanel notifications={notifications} onRefresh={refreshNotifications} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px]">{children}</div>
          </main>
        </div>
      </div>
      <Toaster position="bottom-right" />
    </NotificationContext.Provider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<PropertiesPage />} />
            <Route path="/units" element={<UnitsPage />} />
            <Route path="/tenants" element={<TenantsPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/budgeting/income" element={<IncomePage />} />
            <Route path="/budgeting/deposits" element={<DepositsPage />} />
            <Route path="/budgeting/rent-tracking" element={<RentTrackingPage />} />
            <Route path="/vacancy" element={<VacancyPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/info/parking" element={<ParkingPage />} />
            <Route path="/info/login-info" element={<LoginInfoPage />} />
            <Route path="/info/door-codes" element={<DoorCodesPage />} />
            <Route path="/info/marketing" element={<MarketingPage />} />
            <Route path="/ops/move-in-out" element={<MoveInOutPage />} />
            <Route path="/ops/housekeeping" element={<HousekeepingPage />} />
            <Route path="/ops/maintenance" element={<MaintenancePage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/features" element={<FeaturesPage />} />
          </Routes>
        </ErrorBoundary>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
