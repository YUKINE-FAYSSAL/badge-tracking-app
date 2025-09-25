import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext'; // Add this import
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AdminLayout from './components/layouts/AdminLayout';
import ServiceLayout from './components/layouts/ServiceLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminBadges from './pages/Admin/Badges';
import AdminNotifications from './components/Admin/AdminNotifications';
import AdminBadgeEdit from './components/Admin/AdminBadgeEdit';
import AdminBadgeDetails from './components/Admin/AdminBadgeDetails';
import ServiceDashboard from './pages/Service/Dashboard';
import PermanentList from './pages/Service/PermanentList';
import TemporaryList from './pages/Service/TemporaryList';
import RecoveredList from './pages/Service/RecoveredList';
import PermanentEdit from './pages/Service/Crude/Permanent/PermanentEdit';
import TemporaryEdit from './pages/Service/Crude/Temporary/TemporaryEdit';
import RecoveredEdit from './pages/Service/Crude/Recovered/RecoveredEdit';
import PermanentForm from './pages/Service/Crude/Permanent/PermanentForm';
import TemporaryForm from './pages/Service/Crude/Temporary/TemporaryForm';
import RecoveredForm from './pages/Service/Crude/Recovered/RecoveredForm';
import Spinner from './components/Shared/Spinner';
import BadgeDetails from './pages/Service/Crude/Details/BadgeDetails';
import TemporaryDetails from './pages/Service/Crude/Details/TemporaryDetails';
import RecoveredDetails from './pages/Service/Crude/Details/RecoveredDetails';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-4 bg-red-100 text-red-700 rounded-md text-center">
          <p>An error occurred: {this.state.error.message}</p>
          <p>Please refresh the page or contact support.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner size="lg" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner size="lg" />;
  }

  if (user && window.location.pathname === "/login") {
    const redirectPath = user.role === 'admin' ? '/admin/dashboard' : '/service/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <PrivateRoute requiredRole="admin">
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="badges" element={<AdminBadges />} />
        <Route path="badges/:badgeNum" element={<AdminBadgeDetails />} />
        <Route path="badges/edit/:badgeNum" element={<AdminBadgeEdit />} />
        <Route path="notifications" element={<AdminNotifications />} />
      </Route>

      {/* Service Routes */}
      <Route
        path="/service"
        element={
          <PrivateRoute requiredRole="service">
            <ServiceLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ServiceDashboard />} />

        {/* Permanent */}
        <Route path="permanent" element={<PermanentList />} />
        <Route path="permanent/new" element={<PermanentForm />} />
        <Route path="permanent/edit/:badgeNum" element={<PermanentEdit />} />
        <Route path="permanent/view/:badgeNum" element={<BadgeDetails />} />

        {/* Temporary */}
        <Route path="temporary" element={<TemporaryList />} />
        <Route path="temporary/new" element={<TemporaryForm />} />
        <Route path="temporary/edit/:badgeNum" element={<TemporaryEdit />} />
        <Route path="temporary/view/:badgeNum" element={<TemporaryDetails />} />

        {/* Recovered */}
        <Route path="recovered" element={<RecoveredList />} />
        <Route path="recovered/new" element={<RecoveredForm />} />
        <Route path="recovered/edit/:badgeNum" element={<RecoveredEdit />} />
        <Route path="recovered/view/:badgeNum" element={<RecoveredDetails />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <LanguageProvider> {/* Wrap with LanguageProvider */}
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </LanguageProvider>
    </Router>
  );
}