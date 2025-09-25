// TemporaryList.jsx - Version Française Unifiée - Updated Status System
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Plus, Search, FileText, Eye, AlertTriangle, XCircle, Calendar, X, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

export default function TemporaryList() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [activeTab, setActiveTab] = useState('Tous');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [dismissedAlerts, setDismissedAlerts] = useState({});

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5454/api/badges/temporary', {
        withCredentials: true
      });
      setBadges(response.data.badges || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de récupération des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (badgeNum) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce badge ?')) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5454/api/badges/temporary/${badgeNum}`, {
        withCredentials: true
      });
      setBadges(badges.filter(badge => badge.badge_num !== badgeNum));
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de suppression');
    }
  };

  useEffect(() => {
    const storedDismissedAlerts = JSON.parse(localStorage.getItem('dismissedAlerts') || '{}');
    setDismissedAlerts(storedDismissedAlerts);
  }, []);

  const dismissAlert = (alertType) => {
    setDismissedAlerts(prev => {
      const newState = { ...prev, [alertType]: true };
      localStorage.setItem('dismissedAlerts', JSON.stringify(newState));
      return newState;
    });
  };

  const getProcessingStatus = (badge) => {
    if (!badge.request_date || badge.gr_return_date) {
      return { status: 'completed', color: 'text-gray-400', bg: 'bg-gray-100', message: '' };
    }

    const requestDate = new Date(badge.request_date);
    const today = new Date();
    
    requestDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - requestDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 10) {
      return { 
        status: 'retard', 
        color: 'text-red-700', 
        bg: 'bg-red-200',
        message: 'Retard critique'
      };
    } else if (diffDays >= 6) {
      return { 
        status: 'attention', 
        color: 'text-orange-600', 
        bg: 'bg-orange-100',
        message: 'Attention requise'
      };
    } else {
      return { 
        status: 'normal', 
        color: 'text-gray-600', 
        bg: 'bg-gray-100',
        message: ''
      };
    }
  };

  const getProcessingDays = (badge) => {
    if (!badge.request_date) {
      return { days: 0, text: 'N/A' };
    }
    
    const requestDate = new Date(badge.request_date);
    requestDate.setHours(0, 0, 0, 0);
    
    let endDate;
    let isCompleted = false;
    
    if (badge.gr_return_date) {
      endDate = new Date(badge.gr_return_date);
      isCompleted = true;
    } else {
      endDate = new Date();
      isCompleted = false;
    }
    
    endDate.setHours(0, 0, 0, 0);
    
    const diffTime = endDate.getTime() - requestDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return { days: diffDays, text: `${diffDays}j` };
  };

  // DIFFÉRENCE PRINCIPALE : Gestion de l'expiration pour badges temporaires
  const getValidityStatus = (badge) => {
    if (!badge.gr_return_date || !badge.validity_end) {
      return { 
        status: 'en_cours_traitement', 
        text: 'En cours de traitement',
        color: 'text-blue-600', 
        bg: 'bg-blue-100' 
      };
    }

    const today = new Date();
    const validityEnd = new Date(badge.validity_end);
    
    today.setHours(0, 0, 0, 0);
    validityEnd.setHours(0, 0, 0, 0);

    if (validityEnd > today) {
      const daysRemaining = Math.floor((validityEnd - today) / (1000 * 60 * 60 * 24));
      return { 
        status: 'valide', 
        text: `Valide (${daysRemaining}j)`,
        color: 'text-green-600', 
        bg: 'bg-green-100' 
      };
    } else {
      const daysExpired = Math.floor((today - validityEnd) / (1000 * 60 * 60 * 24));
      return { 
        status: 'expire', 
        text: `Expiré (${daysExpired}j)`,
        color: 'text-red-600', 
        bg: 'bg-red-100' 
      };
    }
  };

  const getStatusBadge = (badge) => {
    if (badge.gr_return_date) {
      return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Terminé</span>;
    } else if (badge.gr_sent_date) {
      return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">GR en cours</span>;
    } else if (badge.dgsn_return_date) {
      return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">DGSN terminée</span>;
    } else if (badge.dgsn_sent_date) {
      return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">DGSN en cours</span>;
    } else {
      return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">Nouveau</span>;
    }
  };

  const filterByStatus = (badge) => {
    const processingStatus = getProcessingStatus(badge);
    const validityStatus = getValidityStatus(badge);
    
    if (activeTab === 'Tous') return true;
    if (activeTab === 'Valide') return validityStatus.status === 'valide';
    if (activeTab === 'Expiré') return validityStatus.status === 'expire';
    if (activeTab === 'En cours de traitement') return validityStatus.status === 'en_cours_traitement';
    if (activeTab === 'Attention') return processingStatus.status === 'attention';
    if (activeTab === 'Retardé') return processingStatus.status === 'retard';
    return true;
  };

  const filterByDate = (badge) => {
    if (!badge.request_date) return false;
    
    const requestDate = new Date(badge.request_date);
    const year = requestDate.getFullYear().toString();
    const month = (requestDate.getMonth() + 1).toString().padStart(2, '0');
    
    if (yearFilter && year !== yearFilter) return false;
    if (monthFilter && month !== monthFilter) return false;
    
    return true;
  };

  const filteredBadges = badges.filter(badge => {
  const searchMatch = (
    badge.badge_num?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    badge.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const companyMatch = badge.company?.toLowerCase().includes(filterCompany.toLowerCase());
  const statusMatch = filterByStatus(badge);
  const dateMatch = filterByDate(badge);
  
  return searchMatch && companyMatch && statusMatch && dateMatch;
});

  const getRowClass = (badge) => {
    const processingStatus = getProcessingStatus(badge);
    const validityStatus = getValidityStatus(badge);
    
    if (processingStatus.status === 'retard' || validityStatus.status === 'expire') {
      return 'bg-red-50';
    } else if (processingStatus.status === 'attention') {
      return 'bg-orange-50';
    }
    return 'hover:bg-gray-50';
  };

  const years = [...new Set(badges
    .filter(badge => badge.request_date)
    .map(badge => new Date(badge.request_date).getFullYear())
    .sort((a, b) => b - a)
  )];

  const months = [
    { value: '01', label: 'Janvier' },
    { value: '02', label: 'Février' },
    { value: '03', label: 'Mars' },
    { value: '04', label: 'Avril' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juin' },
    { value: '07', label: 'Juillet' },
    { value: '08', label: 'Août' },
    { value: '09', label: 'Septembre' },
    { value: '10', label: 'Octobre' },
    { value: '11', label: 'Novembre' },
    { value: '12', label: 'Décembre' }
  ];

  // Updated counts based on new status system
  const allCount = badges.length;
  const valideCount = badges.filter(badge => getValidityStatus(badge).status === 'valide').length;
  const expireCount = badges.filter(badge => getValidityStatus(badge).status === 'expire').length;
  const enCoursTraitementCount = badges.filter(badge => getValidityStatus(badge).status === 'en_cours_traitement').length;
  const attentionCount = badges.filter(badge => getProcessingStatus(badge).status === 'attention').length;
  const retardCount = badges.filter(badge => getProcessingStatus(badge).status === 'retard').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Badges Temporaires</h1>
        <Link
          to="/service/temporary/new"
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter nouveau
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {(retardCount > 0 && !dismissedAlerts['delay']) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Attention urgente requise ({retardCount} badges en retard)</span>
          </div>
          <button onClick={() => dismissAlert('delay')} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {(expireCount > 0 && !dismissedAlerts['expired']) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between items-center">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>Badges expirés ({expireCount} badges nécessitent attention)</span>
          </div>
          <button onClick={() => dismissAlert('expired')} className="text-red-500 hover:text-red-700">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Filtrer par société..."
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Toutes les années</option>
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 bg-white"
          >
            <option value="">Tous les mois</option>
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex space-x-2 mb-4 overflow-x-auto">
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'Tous' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('Tous')}
        >
          Tous ({allCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'Valide' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('Valide')}
        >
          Valide ({valideCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'Expiré' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('Expiré')}
        >
          Expiré ({expireCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'En cours de traitement' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('En cours de traitement')}
        >
          En cours de traitement ({enCoursTraitementCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'Attention' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('Attention')}
        >
          Attention ({attentionCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${activeTab === 'Retardé' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => setActiveTab('Retardé')}
        >
          Retardé ({retardCount})
        </button>
      </div>

      {filteredBadges.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <div className="text-gray-500">Aucun badge trouvé</div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerte Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° Badge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom Complet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Société
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Demande
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jours Traitement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut Validité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBadges.map((badge) => {
                const processingStatus = getProcessingStatus(badge);
                const validityStatus = getValidityStatus(badge);
                const processingDays = getProcessingDays(badge);
                
                return (
                  <tr key={badge.badge_num} className={getRowClass(badge)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {processingStatus.status === 'retard' && (
                        <div className="flex items-center">
                          <XCircle className="text-red-600 animate-pulse" size={20} />
                          <span className="ml-1 text-xs text-red-600 font-bold">RETARD</span>
                        </div>
                      )}
                      {processingStatus.status === 'attention' && (
                        <div className="flex items-center">
                          <AlertTriangle className="text-orange-500" size={18} />
                          <span className="ml-1 text-xs text-orange-500 font-semibold">ATTENTION</span>
                        </div>
                      )}
                      {validityStatus.status === 'expire' && (
                        <div className="flex items-center">
                          <XCircle className="text-red-600" size={20} />
                        </div>
                      )}
                      {validityStatus.status === 'valide' && (
                        <div className="flex items-center">
                          <CheckCircle className="text-green-600" size={18} />
                        </div>
                      )}
                      {!badge.gr_return_date && 
                       processingStatus.status !== 'retard' && 
                       processingStatus.status !== 'attention' && 
                       validityStatus.status !== 'expire' && 
                       validityStatus.status !== 'valide' && (
                        <div className="flex items-center">
                          <Loader2 className="text-blue-600 animate-spin" size={18} />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {badge.badge_num}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.cin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.request_date ? new Date(badge.request_date).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">
                        {processingDays.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(badge)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${validityStatus.bg} ${validityStatus.color}`}>
                        {validityStatus.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/service/temporary/view/${badge.badge_num}`}
                          className="text-green-600 hover:text-green-900"
                          title="Voir"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          to={`/service/temporary/edit/${badge.badge_num}`}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(badge.badge_num)}
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );}