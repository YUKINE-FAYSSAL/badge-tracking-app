// src/components/Shared/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Bell, User, X, CheckCircle, AlertTriangle, Clock, PlusCircle, Trash2 } from 'react-feather';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Only show notifications for admin users
  const isAdmin = user?.role === 'admin';

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const fetchNotifications = async () => {
  if (!isAdmin) return;
  
  try {
    setLoading(true);
    const response = await axios.get('http://localhost:5454/api/notifications', { 
      withCredentials: true 
    });
    
    if (response.data.success) {
      // Filter out locally resolved expiry notifications
      const resolvedExpiryNotifications = JSON.parse(localStorage.getItem('resolvedExpiryNotifications') || '[]');
      const filteredNotifications = response.data.notifications.filter(notification => 
        !resolvedExpiryNotifications.includes(notification.id)
      );
      
      setNotifications(filteredNotifications || []);
      setNotificationCount(filteredNotifications?.length || 0);
    }
  } catch (err) {
    console.error('Failed to fetch notifications:', err);
    if (err.response?.status === 403) {
      setNotifications([]);
      setNotificationCount(0);
    }
  } finally {
    setLoading(false);
  }
};

  const deleteNotification = async (notificationId) => {
  try {
    await axios.delete(`http://localhost:5454/api/notifications/${notificationId}`, {
      withCredentials: true
    });
    
    // For expiry notifications, also mark them as resolved locally
    if (notificationId.startsWith('exp_')) {
      // Add to local storage to prevent re-display
      const resolvedExpiryNotifications = JSON.parse(localStorage.getItem('resolvedExpiryNotifications') || '[]');
      if (!resolvedExpiryNotifications.includes(notificationId)) {
        resolvedExpiryNotifications.push(notificationId);
        localStorage.setItem('resolvedExpiryNotifications', JSON.stringify(resolvedExpiryNotifications));
      }
    }
    
    // Update local state immediately
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setNotificationCount(prev => prev - 1);
    
  } catch (err) {
    console.error('Failed to delete notification:', err);
    // Even if API call fails, remove from UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setNotificationCount(prev => prev - 1);
  }
};

  const clearAllNotifications = async () => {
    try {
      await axios.delete('http://localhost:5454/api/notifications/clear-all', {
        withCredentials: true
      });
      
      setNotifications([]);
      setNotificationCount(0);
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
      setNotifications([]);
      setNotificationCount(0);
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type, severity) => {
    switch (type) {
      case 'nouveau':
        return <PlusCircle className="h-4 w-4 text-blue-500" />;
      case 'retard':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'expiration':
        return <Clock className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critique':
        return 'border-l-red-400 bg-red-50';
      case 'attention':
        return 'border-l-orange-400 bg-orange-50';
      case 'info':
        return 'border-l-blue-400 bg-blue-50';
      default:
        return 'border-l-gray-400 bg-gray-50';
    }
  };

  // Get user icon based on role
  const getUserIcon = () => {
    if (user?.role === 'admin') {
      return (
        <img 
          src="../../assets/images/navbar/admin.jpg" 
          alt="Admin" 
          className="h-10 w-10 rounded-full object-cover shadow-lg ring-2 ring-white/30"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    } else if (user?.role === 'service') {
      return (
        <img 
          src="../../assets/images/navbar/service.jpg" 
          alt="Service" 
          className="h-10 w-10 rounded-full object-cover shadow-lg ring-2 ring-white/30"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }
    
    // Fallback to initial if no image
    return (
      <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white shadow-lg ring-2 ring-white/30 bg-gradient-to-br from-blue-400 to-green-600`}>
        <span className="text-lg font-bold">
          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </span>
      </div>
    );
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 2 * 60 * 1000); // Check every 2 minutes
      return () => clearInterval(interval);
    }
  }, [user, isAdmin]);

  return (
    <header className="bg-gradient-to-r from-indigo-800 to-indigo-900 shadow-lg relative z-50">
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-800/10 to-indigo-900/10 animate-pulse"></div>
      
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Empty div for spacing - keeps original layout */}
        <div className="w-64"></div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-4">
          {/* Enhanced Notifications - Only show for admin */}
          {isAdmin && (
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-xl text-white/80 hover:bg-white/20 hover:text-white transition-all duration-300 hover:scale-110 relative group"
              >
                <Bell className="h-6 w-6" />
                {notificationCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 bg-gradient-to-r from-red-400 to-pink-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-bounce">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </span>
                    <div className="absolute -top-1 -right-1 h-5 w-5 bg-red-400 rounded-full animate-ping opacity-75"></div>
                  </>
                )}
              </button>

              {/* Enhanced Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden z-[9999] border border-white/20 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-4 bg-gradient-to-r from-indigo-800 to-indigo-900 text-white flex justify-between items-center">
                    <h3 className="font-semibold flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      Notifications Administrateur
                      {notificationCount > 0 && (
                        <span className="ml-2 bg-white/20 px-2 py-1 rounded-full text-xs">
                          {notificationCount}
                        </span>
                      )}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={fetchNotifications}
                        className={`text-xs hover:text-indigo-200 transition-colors px-2 py-1 rounded-lg ${
                          loading ? 'animate-spin' : 'hover:bg-white/20'
                        }`}
                        disabled={loading}
                      >
                        {loading ? '🔄' : '↻'}
                      </button>
                      <button
                        onClick={() => setShowNotifications(false)}
                        className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
                        <p className="font-medium">Tout est en ordre</p>
                        <p className="text-sm">Aucune notification</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification, index) => (
                          <div key={`${notification.id}-${index}`} 
                               className={`p-4 transition-all duration-200 hover:bg-gray-50 border-l-4 ${getSeverityColor(notification.severity)}`}>
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <div className="mt-1">
                                  {getNotificationIcon(notification.type, notification.severity)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 leading-tight">
                                    {notification.message}
                                  </p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
                                      Badge: {notification.badge_num}
                                    </span>
                                    {notification.company && (
                                      <span className="flex items-center">
                                        <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
                                        {notification.company}
                                      </span>
                                    )}
                                    {notification.type === 'nouveau' && notification.added_at && (
                                      <span className="flex items-center">
                                        <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-1"></span>
                                        {new Date(notification.added_at).toLocaleDateString()}
                                      </span>
                                    )}
                                    {notification.days_delayed && (
                                      <span className={`font-medium ${
                                        notification.days_delayed >= 10 ? 'text-red-600' :
                                        notification.days_delayed >= 6 ? 'text-orange-600' : 'text-yellow-600'
                                      }`}>
                                        {notification.days_delayed} jours de retard
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteNotification(notification.id);
                                }}
                                className={`flex-shrink-0 ml-3 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 hover:shadow-md transform hover:scale-105 ${
                                  notification.severity === 'critique'
                                    ? 'bg-red-500 text-white hover:bg-red-600' 
                                    : notification.severity === 'attention'
                                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                                    : 'bg-indigo-500 text-white hover:bg-indigo-600'
                                }`}
                              >
                                Résoudre
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-3 bg-gray-50/80 text-center border-t border-gray-200/50">
                      <button
                        onClick={clearAllNotifications}
                        className="text-xs text-gray-600 hover:text-red-600 flex items-center justify-center space-x-1 mx-auto"
                      >
                        <Trash2 className="h-3 w-3" />
                        <span>Effacer toutes les notifications</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Enhanced User Profile */}
          <div className="ml-3 relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center focus:outline-none"
            >
              <div className="relative group">
                {getUserIcon()}
                <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
              </div>
            </button>

            {/* User dropdown menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden z-[9999] border border-white/20 animate-in slide-in-from-top-2 duration-200">
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-800 truncate">{user?.username}</p>
                  <div className="flex items-center mt-1">
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                      user?.role === 'admin' ? 'bg-red-400' : 'bg-blue-400'
                    }`}></span>
                    <p className="text-xs text-gray-500 capitalize font-medium">
                      {user?.role === 'admin' ? 'Administrateur' : 'Utilisateur Service'}
                    </p>
                  </div>
                  {isAdmin && (
                    <p className="text-xs text-indigo-600 mt-1">Privilèges administrateur</p>
                  )}
                </div>
                <div className="border-t border-gray-100/50">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 flex items-center"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom glow effect */}
      <div className="h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent"></div>
    </header>
  );
}