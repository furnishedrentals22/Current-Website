import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { Building2, Home, Users, DollarSign, BarChart3, UserSearch, Calendar, Bell, FileText, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
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

export const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

const NAV_ITEMS = [
  { path: '/', label: 'Properties', icon: Building2, testId: 'sidebar-nav-properties' },
  { path: '/units', label: 'Units', icon: Home, testId: 'sidebar-nav-units' },
  { path: '/tenants', label: 'Tenants', icon: Users, testId: 'sidebar-nav-tenants' },
  { path: '/leads', label: 'Leads', icon: UserSearch, testId: 'sidebar-nav-leads' },
  { path: '/income', label: 'Income', icon: DollarSign, testId: 'sidebar-nav-income' },
  { path: '/vacancy', label: 'Vacancy', icon: BarChart3, testId: 'sidebar-nav-vacancies' },
  { path: '/calendar', label: 'Calendar', icon: Calendar, testId: 'sidebar-nav-calendar' },
  { path: '/features', label: 'Features', icon: FileText, testId: 'sidebar-nav-features' },
];

function NotificationPanel({ notifications, onRefresh }) {
  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    onRefresh();
  };
  const handleDelete = async (id) => {
    await deleteNotification(id);
    onRefresh();
  };

  const active = notifications.filter(n => !n.is_read);
  const viewed = notifications.filter(n => n.is_read);

  return (
    <div className="flex flex-col h-full" data-testid="notifications-panel">
      <div className="px-1 pb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active ({active.length})</h3>
        {active.length === 0 && <p className="text-sm text-muted-foreground mt-2">No active notifications</p>}
        {active.map(n => (
          <div key={n.id} className="mt-2 p-3 rounded-lg border bg-sky-50 border-sky-200" data-testid="notifications-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{n.lead_name} - {n.stage_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                <p className="text-xs text-muted-foreground">Due: {n.notification_date}</p>
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
        {viewed.map(n => (
          <div key={n.id} className="mt-2 p-3 rounded-lg border bg-muted/30" data-testid="notifications-item">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{n.lead_name} - {n.stage_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive ml-2" onClick={() => handleDelete(n.id)}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();

  return (
    <aside className={`hidden lg:flex flex-col bg-card border-r border-border/70 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[272px]'}`}>
      <div className="flex items-center h-16 px-4 border-b border-border/70">
        {!collapsed && <h1 className="font-heading text-lg font-bold text-primary tracking-tight">HarborRent</h1>}
        <Button variant="ghost" size="sm" className={`${collapsed ? 'mx-auto' : 'ml-auto'} h-8 w-8`} onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(item => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.path} to={item.path} data-testid={item.testId}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}
                  ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
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
        <Button variant="ghost" size="sm" className="lg:hidden h-9 w-9">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[272px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="font-heading text-lg font-bold text-primary">HarborRent</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-3">
          {NAV_ITEMS.map(item => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            return (
              <NavLink key={item.path} to={item.path} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-muted/60'}`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
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
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    }
  }, []);

  useEffect(() => {
    refreshNotifications();
    const interval = setInterval(refreshNotifications, 30000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, refreshNotifications }}>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
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
                <SheetHeader>
                  <SheetTitle className="font-heading">Notifications</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-80px)] mt-4">
                  <NotificationPanel notifications={notifications} onRefresh={refreshNotifications} />
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </header>
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-[1400px]">
              {children}
            </div>
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
        <Routes>
          <Route path="/" element={<PropertiesPage />} />
          <Route path="/units" element={<UnitsPage />} />
          <Route path="/tenants" element={<TenantsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/income" element={<IncomePage />} />
          <Route path="/vacancy" element={<VacancyPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/features" element={<FeaturesPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
