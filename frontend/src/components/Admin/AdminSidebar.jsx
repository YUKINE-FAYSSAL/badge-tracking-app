// src/components/Admin/AdminSidebar.jsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  List, 
  LogOut,
  Shield,
  Bell,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => {
    return location.pathname.startsWith(`/admin${path}`);
  };

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="w-64 bg-gradient-to-b from-indigo-800 to-indigo-900 text-white h-screen fixed shadow-xl">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center space-x-2 p-4 mb-8">
          <Shield className="h-8 w-8 text-blue-300 animate-pulse" />
          <h1 className="text-xl font-bold">Panneau d'Administration</h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          <Link 
            to="/admin/dashboard" 
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard') ? 'bg-indigo-700 shadow-md' : 'hover:bg-indigo-700 hover:shadow-md'}`}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Tableau de bord
          </Link>
          
          <Link 
            to="/admin/badges" 
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${isActive('/badges') ? 'bg-indigo-700 shadow-md' : 'hover:bg-indigo-700 hover:shadow-md'}`}
          >
            <List className="mr-3 h-5 w-5" />
            Badges
          </Link>

          <Link 
            to="/admin/notifications" 
            className={`flex items-center p-3 rounded-lg transition-all duration-200 ${isActive('/notifications') ? 'bg-indigo-700 shadow-md' : 'hover:bg-indigo-700 hover:shadow-md'}`}
          >
            <Bell className="mr-3 h-5 w-5" />
            Notifications
          </Link>
        </nav>
        
        <div className="mt-auto p-4">
          <button 
            onClick={handleLogout}
            className="flex items-center p-3 rounded-lg hover:bg-indigo-700 w-full transition-all duration-200"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}