// src/pages/Service/Dashboard.jsx (assuming path based on context)
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clipboard, 
  Clock, 
  RefreshCw, 
  PlusCircle, 
  List, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  UserCheck,
  Building,
  Calendar,
  BarChart3,
  X,
  ExternalLink
} from 'lucide-react';
import axios from 'axios';
import { useTranslation } from '../../hooks/useTranslation';

export default function ServiceDashboard() {
  const [stats, setStats] = useState({
    permanent: 0,
    temporary: 0,
    recovered: 0,
    active: 0,
    expired: 0,
    pending: 0,
    companies: 0,
    avgProcessingTime: 0,
    loading: true,
    error: null
  });

  const [notifications, setNotifications] = useState([]);
  const [notificationsSummary, setNotificationsSummary] = useState({
    delayed: 0,
    expiring: 0,
    new_badges: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all counts and stats
        const endpoints = [
          'http://localhost:5454/api/badges/permanent',
          'http://localhost:5454/api/badges/temporary',
          'http://localhost:5454/api/badges/recovered',
          'http://localhost:5454/api/stats',
          'http://localhost:5454/api/notifications'
        ];

        const requests = endpoints.map(endpoint =>
          axios.get(endpoint, { withCredentials: true })
            .then(res => res.data)
            .catch(err => {
              console.error(`Error fetching ${endpoint}:`, err);
              return null;
            })
        );

        const [permanentRes, temporaryRes, recoveredRes, statsRes, notificationsRes] = await Promise.all(requests);

        // Set basic counts
        setStats({
          permanent: permanentRes ? permanentRes.badges.length : 0,
          temporary: temporaryRes ? temporaryRes.badges.length : 0,
          recovered: recoveredRes ? recoveredRes.badges.length : 0,
          active: statsRes?.summary?.active_badges || 0,
          expired: statsRes?.summary?.expired_badges || 0,
          pending: statsRes?.summary?.pending_badges || 0,
          companies: statsRes?.summary?.companies || 0,
          avgProcessingTime: statsRes?.summary?.avg_processing_time || 0,
          loading: false,
          error: null
        });

        // Set notifications data
        if (notificationsRes && notificationsRes.success) {
          setNotifications(notificationsRes.notifications || []);
          setNotificationsSummary(notificationsRes.summary || {
            delayed: 0,
            expiring: 0,
            new_badges: 0,
            total: 0
          });
        }

      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: err.response?.data?.message || 'Failed to fetch dashboard data'
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const backgroundStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: `url(/assets/images/spiner/logo.png)`,
    backgroundRepeat: 'repeat',
    opacity: 0.1,
    filter: 'blur(4px)',
    pointerEvents: 'none',
    zIndex: -1
  };

  const StatCard = ({ title, value, icon: Icon, color, loading }) => (
    <div className="bg-white rounded-lg shadow p-4 flex items-center">
      <div className={`p-3 rounded-full ${color.bg} mr-4`}>
        <Icon className={`h-6 w-6 ${color.text}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-800">
          {loading ? '...' : value.toLocaleString()}
        </p>
      </div>
    </div>
  );

  const resolveNotification = async (badgeNum, notificationType) => {
    try {
      await axios.post('http://localhost:5454/api/notifications/resolve', {
        badge_num: badgeNum,
        type: notificationType
      }, { withCredentials: true });

      // Remove the notification from the state
      setNotifications(prevNotifications =>
        prevNotifications.filter(
          notification => notification.badge_num !== badgeNum || notification.type !== notificationType
        )
      );

      // Update summary counts
      setNotificationsSummary(prev => ({
        ...prev,
        [notificationType === 'delay' ? 'delayed' : notificationType === 'expiry' ? 'expiring' : 'new_badges']: 
          Math.max(0, prev[notificationType === 'delay' ? 'delayed' : notificationType === 'expiry' ? 'expiring' : 'new_badges'] - 1),
        total: Math.max(0, prev.total - 1)
      }));

    } catch (err) {
      console.error('Error resolving notification:', err);
    }
  };

  const acknowledgeNewBadge = async (badgeNum) => {
    try {
      await axios.post('http://localhost:5454/api/notifications/acknowledge-new', {
        badge_num: badgeNum
      }, { withCredentials: true });

      resolveNotification(badgeNum, 'new_badge');
    } catch (err) {
      console.error('Error acknowledging new badge:', err);
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'delay':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'expiry':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'new_badge':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'delay':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'expiry':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'new_badge':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="relative p-6 min-h-screen bg-gray-50">
      <div style={backgroundStyle} />
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="mr-3 text-blue-600" />
            {t('service.dashboardTitle')}
          </h1>
        </div>

        {stats.error && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg border border-red-200 flex items-center">
            <AlertCircle className="mr-2 h-5 w-5" />
            {stats.error}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title={t('stats.totalBadges')} 
            value={stats.permanent + stats.temporary + stats.recovered} 
            icon={Clipboard} 
            color={{ bg: 'bg-blue-100', text: 'text-blue-600' }}
            loading={stats.loading}
          />
          <StatCard 
            title={t('stats.activeBadges')} 
            value={stats.active} 
            icon={CheckCircle} 
            color={{ bg: 'bg-green-100', text: 'text-green-600' }}
            loading={stats.loading}
          />
          <StatCard 
            title={t('stats.companiesServed')} 
            value={stats.companies} 
            icon={Building} 
            color={{ bg: 'bg-purple-100', text: 'text-purple-600' }}
            loading={stats.loading}
          />
          <StatCard 
            title={t('service.avgProcessing')} 
            value={stats.avgProcessingTime} 
            icon={TrendingUp} 
            color={{ bg: 'bg-amber-100', text: 'text-amber-600' }}
            loading={stats.loading}
          />
        </div>

        {/* Badge Type Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Permanent Badges Card */}
          <div className="bg-white rounded-lg shadow-lg  border border-blue-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full mr-4">
                    <Clipboard className="text-blue-600 h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{t('stats.permanent')}</h2>
                    <p className="text-2xl font-bold text-blue-600">
                      {stats.loading ? '...' : stats.permanent}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  stats.permanent > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {stats.permanent > 0 ? t('service.active') : t('service.noBadges')}
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  to="/service/permanent"
                  className="block w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <List size={18} />
                  <span>{t('sidebar.viewAll')}</span>
                </Link>
                <Link
                  to="/service/permanent/new"
                  className="block w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusCircle size={18} />
                  <span>{t('service.addNew')}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Temporary Badges Card */}
          <div className="bg-white rounded-lg shadow-lg  border border-yellow-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-full mr-4">
                    <Clock className="text-yellow-600 h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{t('stats.temporary')}</h2>
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats.loading ? '...' : stats.temporary}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  stats.temporary > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {stats.temporary > 0 ? t('service.active') : t('service.noBadges')}
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  to="/service/temporary"
                  className="block w-full px-4 py-2 bg-yellow-50 text-yellow-700 rounded-md hover:bg-yellow-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <List size={18} />
                  <span>{t('sidebar.viewAll')}</span>
                </Link>
                <Link
                  to="/service/temporary/new"
                  className="block w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusCircle size={18} />
                  <span>{t('service.addNew')}</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Recovered Badges Card */}
          <div className="bg-white rounded-lg shadow-lg  border border-green-100">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full mr-4">
                    <RefreshCw className="text-green-600 h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{t('stats.recovered')}</h2>
                    <p className="text-2xl font-bold text-green-600">
                      {stats.loading ? '...' : stats.recovered}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  stats.recovered > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {stats.recovered > 0 ? t('service.active') : t('service.noBadges')}
                </div>
              </div>
              <div className="space-y-3">
                <Link
                  to="/service/recovered"
                  className="block w-full px-4 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors flex items-center justify-center space-x-2"
                >
                  <List size={18} />
                  <span>{t('sidebar.viewAll')}</span>
                </Link>
                <Link
                  to="/service/recovered/new"
                  className="block w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusCircle size={18} />
                  <span>{t('service.addNew')}</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}