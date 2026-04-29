import { Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Users from "@/pages/users";
import Companies from "@/pages/companies";
import Account from "@/pages/account";
import Accounting from "@/pages/accounting";
import Payments from "@/pages/payments";
import CoDashboard from "@/pages/co-dashboard";
import ProductPurchase from "@/pages/product-purchase";
import Inventory from "@/pages/inventory";
import Landing from "@/pages/landing";
import SignIn from "@/pages/sign-in";
import SignUp from "@/pages/sign-up";
import { AuthProvider } from "@/lib/auth-context";
import { useAuth } from "@/lib/use-auth";
import { BrandProvider } from "@/lib/brand-context";
import type { ReactElement } from "react";

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/sign-in" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function GuestOnly({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/sign-in"
        element={
          <GuestOnly>
            <SignIn />
          </GuestOnly>
        }
      />
      <Route
        path="/sign-up"
        element={
          <GuestOnly>
            <SignUp />
          </GuestOnly>
        }
      />
      <Route
        path="/co-dashboard"
        element={
          <ProtectedRoute>
            <CoDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product-purchase"
        element={
          <ProtectedRoute>
            <Inventory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute>
            <ProductPurchase />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <Upload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <Users />
          </ProtectedRoute>
        }
      />
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Companies />
          </ProtectedRoute>
        }
      />
      <Route
        path="/account"
        element={
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <ProtectedRoute>
            <Accounting />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <Payments />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider>
        <AuthProvider>
          <TooltipProvider>
            <AppRoutes />
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrandProvider>
    </QueryClientProvider>
  );
}
