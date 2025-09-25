// src/components/Service/ServiceSidebar.jsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home,
  List,
  Shield,
  LogOut,
  FileText,
  Clock,
  Archive
} from 'react-feather';
import { useAuth } from '../../context/AuthContext';

export default function ServiceSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => {
    return location.pathname === `/service${path}`;
  };

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="w-64 bg-indigo-800 text-white h-screen fixed">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center space-x-2 p-4 mb-8">
          <Shield className="h-8 w-8 text-indigo-300" />
          <h1 className="text-xl font-bold">Panneau Service</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <Link
            to="/service/dashboard"
            className={`flex items-center p-3 rounded-lg ${
              isActive('/dashboard') ? 'bg-indigo-600' : 'hover:bg-indigo-700'
            }`}
          >
            <Home className="mr-3" size={16} />
            Tableau de bord
          </Link>

          {/* Section Badges Permanents */}
          <div className="pl-4">
            <h3 className="text-sm font-semibold text-indigo-200 mb-1">Badges Permanents</h3>
            <Link
              to="/service/permanent"
              className={`flex items-center p-3 rounded-lg ${
                isActive('/permanent') ? 'bg-indigo-600' : 'hover:bg-indigo-700'
              }`}
            >
              <FileText className="mr-3" size={16} />
              Voir tous
            </Link>
          </div>

          {/* Section Badges Temporaires */}
          <div className="pl-4">
            <h3 className="text-sm font-semibold text-indigo-200 mb-1">Badges Temporaires</h3>
            <Link
              to="/service/temporary"
              className={`flex items-center p-3 rounded-lg ${
                isActive('/temporary') ? 'bg-indigo-600' : 'hover:bg-indigo-700'
              }`}
            >
              <Clock className="mr-3" size={16} />
              Voir tous
            </Link>
          </div>

          {/* Section Badges Récupérés */}
          <div className="pl-4">
            <h3 className="text-sm font-semibold text-indigo-200 mb-1">Badges Récupérés</h3>
            <Link
              to="/service/recovered"
              className={`flex items-center p-3 rounded-lg ${
                isActive('/recovered') ? 'bg-indigo-600' : 'hover:bg-indigo-700'
              }`}
            >
              <Archive className="mr-3" size={16} />
              Voir tous
            </Link>
          </div>
        </nav>

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="flex items-center p-3 rounded-lg hover:bg-indigo-700 w-full"
          >
            <LogOut className="mr-3" size={16} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}