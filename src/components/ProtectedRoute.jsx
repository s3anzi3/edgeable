import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function ProtectedRoute({ children, requiredRole }) {
  const { currentUser, role, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && role !== requiredRole) {
    const target = role === 'admin' ? '/admin' : '/dashboard';
    return <Navigate to={target} replace />;
  }

  return children;
}
