import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Transactions from "./pages/Transactions";
import TransactionForm from "./pages/TransactionForm";
import Categories from "./pages/Categories";
import Accounts from "./pages/Accounts";
import NotFound from "./pages/NotFound";
import Community from "./pages/Community";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/transacoes" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
            <Route path="/transacoes/nova" element={<ProtectedRoute><TransactionForm /></ProtectedRoute>} />
            <Route path="/transacoes/:id/editar" element={<ProtectedRoute><TransactionForm /></ProtectedRoute>} />
            <Route path="/categorias" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/contas" element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
            <Route path="/comunidade" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
