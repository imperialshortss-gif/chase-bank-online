import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/lib/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { AppLayout } from '@/components/layouts/app-layout';
import { AdminLayout } from '@/components/layouts/admin-layout';
import "@/lib/api-setup";

// Pages
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import Transactions from '@/pages/transactions';
import Transfer from '@/pages/transfer';
import Profile from '@/pages/profile';
import Settings from '@/pages/settings';
import AdminLogin from '@/pages/admin/login';
import AdminDashboard from '@/pages/admin/dashboard';
import AdminUsers from '@/pages/admin/users';
import AdminUserDetail from '@/pages/admin/users/[id]';
import AdminTransfers from '@/pages/admin/transfers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/admin" component={AdminLogin} />
      
      {/* Protected User Routes */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute>
          <AppLayout><Transactions /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/transfer">
        <ProtectedRoute>
          <AppLayout><Transfer /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <AppLayout><Profile /></AppLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AppLayout><Settings /></AppLayout>
        </ProtectedRoute>
      </Route>

      {/* Protected Admin Routes */}
      <Route path="/admin/dashboard">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminDashboard /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminUsers /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users/:id">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminUserDetail /></AdminLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/transfers">
        <ProtectedRoute adminOnly>
          <AdminLayout><AdminTransfers /></AdminLayout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="chase-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <AuthProvider>
              <Router />
            </AuthProvider>
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
