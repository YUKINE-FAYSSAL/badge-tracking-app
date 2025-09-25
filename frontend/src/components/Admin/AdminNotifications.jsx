import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Clock, PlusCircle, RefreshCw, CheckCircle, AlertTriangle, Trash2, X } from 'react-feather';
import { useAuth } from '../../context/AuthContext';

export default function AdminNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const fetchNotifications = async () => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5454/api/notifications', { 
        withCredentials: true 
      });

      if (response.data.success) {
        setNotifications(response.data.notifications || []);
        setLastUpdated(response.data.last_updated);
      }
    } catch (err) {
      console.error('Échec de chargement des notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`http://localhost:5454/api/notifications/${notificationId}`, {
        withCredentials: true
      });
      
      // Remove from local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Échec de suppression de la notification:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      await axios.delete('http://localhost:5454/api/notifications/clear-all', {
        withCredentials: true
      });
      
      setNotifications([]);
    } catch (err) {
      console.error('Échec de suppression de toutes les notifications:', err);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 60000); // 1 minute
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <div className="text-gray-500 py-8">
          <Bell className="mx-auto h-12 w-12 mb-4 text-gray-300" />
          <p className="font-medium">Accès administrateur requis</p>
          <p className="text-sm text-gray-400 mt-1">Seuls les administrateurs peuvent voir les notifications</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-indigo-600 mr-3" />
          <span className="text-gray-600 text-lg">Chargement des notifications...</span>
        </div>
      </div>
    );
  }

  const criticalCount = notifications.filter(n => n.severity === 'critique').length;
  const warningCount = notifications.filter(n => n.severity === 'attention').length;
  const infoCount = notifications.filter(n => n.severity === 'info').length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-indigo-100">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Centre de Notifications</h2>
            <p className="text-sm text-gray-600">
              {lastUpdated && `Dernière mise à jour: ${new Date(lastUpdated).toLocaleTimeString('fr-FR')}`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {notifications.length > 0 && (
            <button
              onClick={clearAllNotifications}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded-lg hover:bg-red-50 hover:border-red-300 transition-colors flex items-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>Tout supprimer</span>
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary Badges */}
      {notifications.length > 0 && (
        <div className="flex flex-wrap gap-3 p-6 bg-gray-50 border-b">
          {criticalCount > 0 && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {criticalCount} Critique{criticalCount > 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-orange-100 text-orange-800">
              <AlertTriangle className="h-4 w-4 mr-2" />
              {warningCount} Attention{warningCount > 1 ? 's' : ''}
            </span>
          )}
          {infoCount > 0 && (
            <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
              <Bell className="h-4 w-4 mr-2" />
              {infoCount} Info{infoCount > 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800">
            Total: {notifications.length}
          </span>
        </div>
      )}

      {/* Notifications List */}
      <div className="p-6">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle className="mx-auto h-16 w-16 mb-4 text-gray-300" />
            <p className="text-xl font-medium text-gray-700">Aucune notification</p>
            <p className="text-gray-500 mt-2">Toutes les tâches sont à jour</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onDelete={deleteNotification}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const NotificationItem = ({ notification, onDelete }) => {
  const getIcon = () => {
    switch (notification.severity) {
      case 'critique':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'attention':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case 'info':
        return notification.type === 'nouveau' 
          ? <PlusCircle className="h-5 w-5 text-blue-500" />
          : <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBorderColor = () => {
    switch (notification.severity) {
      case 'critique': return 'border-l-red-500 bg-red-50';
      case 'attention': return 'border-l-orange-500 bg-orange-50';
      case 'info': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  return (
    <div className={`border-l-4 ${getBorderColor()} rounded-r-lg p-4 transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="mt-1">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 mb-2">
              {notification.message}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
              <span className="font-semibold">Badge: #{notification.badge_num}</span>
              {notification.full_name && <span>Nom: {notification.full_name}</span>}
              {notification.company && <span>Société: {notification.company}</span>}
              {notification.days_delayed && (
                <span className={`font-semibold px-2 py-1 rounded-full ${
                  notification.days_delayed >= 10 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  Retard: {notification.days_delayed} jours
                </span>
              )}
              {notification.days_remaining && (
                <span className="font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  Expire dans: {notification.days_remaining} jours
                </span>
              )}
              {notification.added_by && (
                <span className="text-indigo-600">
                  Ajouté par: {notification.added_by}
                </span>
              )}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => onDelete(notification.id)}
          className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
          title="Supprimer cette notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};