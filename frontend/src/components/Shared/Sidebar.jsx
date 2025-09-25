// src/components/Shared/Sidebar.jsx
import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Home,
  FileText,
  Users,
  Settings,
  LogOut,
  Shield,
  Calendar,
  Bell,
  BarChart2
} from 'react-feather';

export default function Sidebar({ role }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => location.pathname.includes(path);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const adminLinks = [
    { path: '/admin/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/admin/badges', icon: FileText, label: 'Badges' },
    { path: '/admin/users', icon: Users, label: 'Utilisateurs' },
    { path: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { path: '/admin/statistics', icon: BarChart2, label: 'Statistiques' },
    { path: '/admin/settings', icon: Settings, label: 'Paramètres' }
  ];

  const serviceLinks = [
    { path: '/service/dashboard', icon: Home, label: 'Tableau de bord' },
    { path: '/service/permanent', icon: FileText, label: 'Badges Permanents' },
    { path: '/service/temporary', icon: Calendar, label: 'Badges Temporaires' },
    { path: '/service/recovered', icon: Shield, label: 'Badges Récupérés' }
  ];

  const links = role === 'admin' ? adminLinks : serviceLinks;

  return (
    <div className="w-64 bg-indigo-800 text-white h-screen fixed">
      <div className="p-4 h-full flex flex-col">
        <div className="flex items-center space-x-2 p-4 mb-8">
          <Shield className="h-8 w-8 text-indigo-300" />
          <h1 className="text-xl font-bold">
            {role === 'admin' ? 'Panneau d\'Administration' : 'Panneau Service'}
          </h1>
        </div>

        <nav className="flex-1 space-y-1">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center p-3 rounded-lg ${
                isActive(link.path) ? 'bg-indigo-600' : 'hover:bg-indigo-700'
              }`}
            >
              <link.icon className="mr-3" />
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="flex items-center p-3 rounded-lg hover:bg-indigo-700 w-full"
          >
            <LogOut className="mr-3" />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}