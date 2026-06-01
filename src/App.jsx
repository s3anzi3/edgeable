import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Guide from './pages/Guide.jsx';
import Admin from './pages/Admin.jsx';
import NewTransaction from './pages/admin/NewTransaction.jsx';
import EditTransaction from './pages/admin/EditTransaction.jsx';
import SubscriberDetail from './pages/admin/SubscriberDetail.jsx';
import AllTransactions from './pages/admin/AllTransactions.jsx';
import PendingRequests from './pages/admin/PendingRequests.jsx';
import PnLManager from './pages/admin/PnLManager.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requiredRole="user">
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/guide"
        element={
          <ProtectedRoute>
            <Guide />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <Admin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions"
        element={
          <ProtectedRoute requiredRole="admin">
            <AllTransactions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions/new"
        element={
          <ProtectedRoute requiredRole="admin">
            <NewTransaction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/transactions/:id/edit"
        element={
          <ProtectedRoute requiredRole="admin">
            <EditTransaction />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/subscribers/:uid"
        element={
          <ProtectedRoute requiredRole="admin">
            <SubscriberDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute requiredRole="admin">
            <PendingRequests />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pnl"
        element={
          <ProtectedRoute requiredRole="admin">
            <PnLManager />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
