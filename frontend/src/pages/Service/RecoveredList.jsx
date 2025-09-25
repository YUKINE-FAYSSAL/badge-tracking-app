// RecoveredList.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Edit, Trash2, Plus, Search, FileText, Eye, Calendar } from 'lucide-react';
import axios from 'axios';

export default function RecoveredList() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const [activeTab, setActiveTab] = useState('renouvellement');
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [yearFilter, setYearFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  useEffect(() => {
    fetchBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5454/api/badges/recovered', {
        withCredentials: true
      });
      setBadges(response.data.badges || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec du chargement des badges récupérés');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (badgeNum) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce badge récupéré ?')) {
      return;
    }

    try {
      await axios.delete(`http://localhost:5454/api/badges/recovered/${badgeNum}`, {
        withCredentials: true
      });
      setBadges(badges.filter(badge => badge.badge_num !== badgeNum));
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la suppression du badge');
    }
  };

  const filterByRecoveryType = (badge) => {
    if (activeTab === 'renouvellement') {
      if (badge.recovery_type !== 'renouvellement') return false;
      
      if (activeSubTab === 'temporary') {
        return badge.badge_type === 'temporary';
      } else if (activeSubTab === 'permanent') {
        return badge.badge_type === 'permanent';
      }
      return true;
    } else if (activeTab === 'decharge') {
      return badge.recovery_type === 'décharge';
    }
    return true;
  };

  const filterByDate = (badge) => {
    if (!badge.recovery_date) return false;
    
    const recoveryDate = new Date(badge.recovery_date);
    const year = recoveryDate.getFullYear().toString();
    const month = (recoveryDate.getMonth() + 1).toString().padStart(2, '0');
    
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
    const typeMatch = filterByRecoveryType(badge);
    const dateMatch = filterByDate(badge);
    
    return searchMatch && companyMatch && typeMatch && dateMatch;
  });

  const years = [...new Set(badges
    .filter(badge => badge.recovery_date)
    .map(badge => new Date(badge.recovery_date).getFullYear())
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

  const renouvellementBadges = badges.filter(badge => badge.recovery_type === 'renouvellement');
  const renouvellementCount = renouvellementBadges.length;
  const dechargeCount = badges.filter(badge => badge.recovery_type === 'décharge').length;
  
  const temporaryRenouvellementCount = renouvellementBadges.filter(badge => badge.badge_type === 'temporary').length;
  const permanentRenouvellementCount = renouvellementBadges.filter(badge => badge.badge_type === 'permanent').length;

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
        <h1 className="text-2xl font-bold text-gray-800">Badges Récupérés</h1>
        <Link
          to="/service/recovered/new"
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter Nouveau
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par numéro de badge ou nom..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
          />
        </div>
        <div className="relative">
          <input
            type="text"
            placeholder="Filtrer par entreprise"
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

      <div className="flex space-x-2 mb-4">
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'renouvellement' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => { setActiveTab('renouvellement'); setActiveSubTab('All'); }}
        >
          Renouvellement ({renouvellementCount})
        </button>
        <button
          className={`px-3 py-1 text-sm font-medium rounded-md ${activeTab === 'decharge' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
          onClick={() => { setActiveTab('decharge'); setActiveSubTab('All'); }}
        >
          Décharge ({dechargeCount})
        </button>
      </div>

      {activeTab === 'renouvellement' && (
        <div className="flex space-x-2 mb-4">
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${activeSubTab === 'All' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
            onClick={() => setActiveSubTab('All')}
          >
            Tous ({renouvellementCount})
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${activeSubTab === 'temporary' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
            onClick={() => setActiveSubTab('temporary')}
          >
            Temporaire ({temporaryRenouvellementCount})
          </button>
          <button
            className={`px-3 py-1 text-sm font-medium rounded-md ${activeSubTab === 'permanent' ? 'bg-green-100 text-green-700 border border-green-300' : 'text-gray-600 hover:text-green-600'}`}
            onClick={() => setActiveSubTab('permanent')}
          >
            Permanent ({permanentRenouvellementCount})
          </button>
        </div>
      )}

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
                  Numéro de Badge
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nom Complet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entreprise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CIN
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de Récupération
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type de Récupération
                </th>
                {activeTab === 'renouvellement' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type de Badge
                  </th>
                )}
                {activeTab === 'renouvellement' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Info Validité
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBadges.map((badge) => (
                <tr key={badge.badge_num} className="hover:bg-gray-50">
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
                    {badge.recovery_date?.slice(0, 10) || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      badge.recovery_type === 'renouvellement' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {badge.recovery_type}
                    </span>
                  </td>
                  {activeTab === 'renouvellement' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.badge_type && (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          badge.badge_type === 'temporary' 
                            ? 'bg-orange-100 text-orange-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {badge.badge_type === 'temporary' ? 'Temporaire' : 'Permanent'}
                        </span>
                      )}
                    </td>
                  )}
                  {activeTab === 'renouvellement' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {badge.badge_type === 'temporary' && badge.validity_start && badge.validity_end ? (
                        <div className="text-xs">
                          <div>{badge.validity_start?.slice(0, 10)}</div>
                          <div className="text-gray-500">à</div>
                          <div>{badge.validity_end?.slice(0, 10)}</div>
                        </div>
                      ) : badge.badge_type === 'permanent' && badge.validity_duration ? (
                        <span className="text-xs font-medium text-green-700">
                          {badge.validity_duration}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        to={`/service/recovered/view/${badge.badge_num}`}
                        className="text-green-600 hover:text-green-900"
                        title="Voir"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/service/recovered/edit/${badge.badge_num}`}
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}