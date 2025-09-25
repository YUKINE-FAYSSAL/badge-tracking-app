// File: AdminBadgeList.jsx - FIXED VERSION - Corrected Status Logic
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Search, 
  Eye,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  FileText,
  Plus,
  Filter
} from 'lucide-react';

const AdminBadgeList = () => {
  const [badges, setBadges] = useState([]);
  const [filteredBadges, setFilteredBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    status: 'all'
  });

  useEffect(() => {
    fetchAllBadges();
  }, []);

  useEffect(() => {
    filterBadges();
  }, [badges, filters]);

  const fetchAllBadges = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5454/api/badges', {
        withCredentials: true
      });
      
      if (response.data.success) {
        const processedBadges = response.data.badges.map(badge => {
          const processedBadge = {
            ...badge,
            badgeNumber: badge.badgeNumber || badge.badge_num,
            fullName: badge.fullName || badge.full_name,
            company: badge.company,
            badgeType: badge.badgeType,
            requestDate: badge.requestDate || badge.request_date || badge.recovery_date,
            validity_end: badge.validity_end,
            recovery_type: badge.recovery_type,
            badge_type: badge.badge_type,
            gr_return_date: badge.gr_return_date,
            gr_returned: badge.gr_returned,
            validity_duration: badge.validity_duration
          };
          
          // Calculate unified status with FIXED logic
          processedBadge.status = determineUnifiedStatus(processedBadge);
          processedBadge.processingStatus = getProcessingStatus(processedBadge);
          
          return processedBadge;
        });
        
        setBadges(processedBadges);
      } else {
        setError('Échec du chargement des badges');
      }
    } catch (err) {
      console.error('Erreur lors du chargement des badges:', err);
      setError('Échec du chargement des badges');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get days since request
  const getDaysSinceRequest = (badge) => {
    if (!badge.requestDate) return 0;
    const requestDate = new Date(badge.requestDate);
    const today = new Date();
    requestDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return Math.floor((today - requestDate) / (1000 * 60 * 60 * 24));
  };

  // CORRECTED STATUS DETERMINATION - All incomplete badges are "processing"
  const determineUnifiedStatus = (badge) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // RECOVERED BADGES - Always show as "recovered" (this is a TYPE, not a processing status)
    if (badge.badgeType === 'recovered') {
      return 'recovered';
    }
    
    // For PERMANENT and TEMPORARY badges, check if completed first
    const isCompleted = badge.gr_return_date || badge.gr_returned;
    
    if (isCompleted) {
      // Badge is completed - check validity
      if (badge.badgeType === 'permanent') {
        const completionDate = new Date(badge.gr_return_date);
        completionDate.setHours(0, 0, 0, 0);
        
        let validityEnd;
        const duration = badge.validity_duration || '1 year';
        
        if (duration === '1 year') {
          validityEnd = new Date(completionDate);
          validityEnd.setFullYear(validityEnd.getFullYear() + 1);
        } else if (duration === '3 years') {
          validityEnd = new Date(completionDate);
          validityEnd.setFullYear(validityEnd.getFullYear() + 3);
        } else if (duration === '5 years') {
          validityEnd = new Date(completionDate);
          validityEnd.setFullYear(validityEnd.getFullYear() + 5);
        } else {
          validityEnd = new Date(completionDate);
          validityEnd.setFullYear(validityEnd.getFullYear() + 1);
        }
        
        return today > validityEnd ? 'expired' : 'active';
        
      } else if (badge.badgeType === 'temporary') {
        if (badge.validity_end) {
          const validityEndDate = new Date(badge.validity_end);
          validityEndDate.setHours(0, 0, 0, 0);
          return validityEndDate < today ? 'expired' : 'active';
        }
        return 'active'; // If no validity_end but completed, assume active
      }
    } else {
      // Badge NOT completed = ALWAYS "processing" regardless of delay time
      // The delay info is shown in processingStatus, not in main status
      return 'processing';
    }
    
    return 'processing'; // Fallback
  };

  // Get processing status (unified system)
  const getProcessingStatus = (badge) => {
    if (badge.badgeType === 'recovered') {
      return { status: 'recovered', days: 0, message: 'Récupéré' };
    }
    
    if (!badge.requestDate) {
      return { status: 'no-date', days: 0, message: 'N/A' };
    }

    const requestDate = new Date(badge.requestDate);
    requestDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if badge is completed
    if (badge.gr_return_date || badge.gr_returned) {
      const completionDate = new Date(badge.gr_return_date);
      const processingDays = Math.floor((completionDate - requestDate) / (1000 * 60 * 60 * 24));
      
      return { 
        status: 'completed', 
        days: processingDays, 
        message: `Terminé (${processingDays}j)` 
      };
    }
    
    // Active processing
    const daysSinceRequest = Math.floor((today - requestDate) / (1000 * 60 * 60 * 24));
    
    if (daysSinceRequest >= 10) {
      return { 
        status: 'delayed', 
        days: daysSinceRequest, 
        message: `🚨 RETARD (${daysSinceRequest}j)` 
      };
    } else if (daysSinceRequest >= 6) {
      return { 
        status: 'warning', 
        days: daysSinceRequest, 
        message: `⚠️ ATTENTION (${daysSinceRequest}j)` 
      };
    } else {
      return { 
        status: 'processing', 
        days: daysSinceRequest, 
        message: `En traitement (${daysSinceRequest}j)` 
      };
    }
  };

  const filterBadges = () => {
    let result = badges;
    
    // Filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(badge => 
        badge.badgeNumber?.toLowerCase().includes(searchTerm) ||
        badge.fullName?.toLowerCase().includes(searchTerm) ||
        badge.company?.toLowerCase().includes(searchTerm) ||
        badge.cin?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by type
    if (filters.type !== 'all') {
      result = result.filter(badge => badge.badgeType === filters.type);
    }
    
    // FIXED: Filter by status - All incomplete badges (retardé, attention, normal) are "processing"
    if (filters.status !== 'all') {
      result = result.filter(badge => {
        // Skip recovered badges for status filtering since "recovered" is a type, not a status
        if (badge.badgeType === 'recovered') return false;
        
        // For special cases, check processing status details
        if (filters.status === 'delayed') {
          // Show only badges that are in processing AND delayed (10+ days)
          if (badge.status !== 'processing') return false;
          const daysSince = getDaysSinceRequest(badge);
          return daysSince >= 10;
        }
        
        if (filters.status === 'warning') {
          // Show only badges that are in processing AND need attention (6-9 days)
          if (badge.status !== 'processing') return false;
          const daysSince = getDaysSinceRequest(badge);
          return daysSince >= 6 && daysSince < 10;
        }
        
        // For other statuses, use the main status
        return badge.status === filters.status;
      });
    }
    
    setFilteredBadges(result);
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  // FIXED: Status colors with correct French labels
  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'delayed': return 'bg-red-100 text-red-800 border-red-200'; // RETARD
      case 'warning': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'recovered': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // FIXED: Status labels with correct French terms
  const getStatusLabel = (status) => {
    switch(status) {
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'delayed': return 'Retardé'; // CORRECT: This is RETARD, not expired
      case 'warning': return 'Attention';
      case 'processing': return 'En traitement';
      case 'recovered': return 'Récupéré';
      default: return 'Inconnu';
    }
  };

  // Status icon component
  const getStatusIcon = (badge) => {
    const status = badge.status;
    
    if (status === 'expired') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    } else if (status === 'delayed') {
      return <XCircle className="h-4 w-4 text-red-600 animate-pulse" />;
    } else if (status === 'warning') {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    } else if (status === 'active') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    } else if (status === 'processing') {
      return <Clock className="h-4 w-4 text-blue-600" />;
    } else if (status === 'recovered') {
      return <RefreshCw className="h-4 w-4 text-purple-600" />;
    }
    
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'permanent': return 'border-blue-200 bg-blue-50';
      case 'temporary': return 'border-yellow-200 bg-yellow-50';
      case 'recovered': return 'border-purple-200 bg-purple-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeLabel = (type) => {
    switch(type) {
      case 'permanent': return 'Permanent';
      case 'temporary': return 'Temporaire';
      case 'recovered': return 'Récupéré';
      default: return type;
    }
  };

  const formatRecoveryDisplay = (badge) => {
    if (badge.badgeType !== 'recovered') return null;
    
    const recoveryType = badge.recovery_type;
    const subType = badge.badge_type;
    
    if (recoveryType === 'décharge') {
      return 'Décharge';
    } else if (recoveryType === 'renouvellement') {
      return subType ? `Renouvellement (${subType})` : 'Renouvellement';
    }
    
    return recoveryType || 'Récupération';
  };

  const getValidityDisplay = (badge) => {
    if (badge.badgeType === 'permanent') {
      return badge.validity_duration || 'Permanent';
    } else if (badge.badgeType === 'temporary') {
      return badge.validityDuration || 'Temporaire';
    } else if (badge.badgeType === 'recovered') {
      return formatRecoveryDisplay(badge);
    }
    return 'N/A';
  };

  // CORRECTED: Calculate counts - processing includes delayed and warning
  const getStatusCounts = () => {
    const nonRecoveredBadges = badges.filter(b => b.badgeType !== 'recovered');
    
    // Count delayed and warning badges (they are subcategories of processing)
    const delayedBadges = nonRecoveredBadges.filter(b => {
      if (b.status !== 'processing') return false;
      const days = getDaysSinceRequest(b);
      return days >= 10;
    });
    
    const warningBadges = nonRecoveredBadges.filter(b => {
      if (b.status !== 'processing') return false;
      const days = getDaysSinceRequest(b);
      return days >= 6 && days < 10;
    });
    
    return {
      total: badges.length,
      active: nonRecoveredBadges.filter(b => b.status === 'active').length,
      expired: nonRecoveredBadges.filter(b => b.status === 'expired').length,
      delayed: delayedBadges.length, // Subcategory of processing
      warning: warningBadges.length, // Subcategory of processing  
      processing: nonRecoveredBadges.filter(b => b.status === 'processing').length, // Total processing (includes delayed + warning)
      recovered: badges.filter(b => b.badgeType === 'recovered').length // This is a type count
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Badges</h1>
          </div>
          
          <p className="text-gray-600">Gérez tous les badges du système</p>
          
          {/* FIXED Status Summary */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg border shadow-sm">
              <div className="font-semibold text-gray-900 text-lg">{statusCounts.total}</div>
              <div className="text-gray-600">Total</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg border border-green-200 shadow-sm">
              <div className="font-semibold text-green-800 text-lg">{statusCounts.active}</div>
              <div className="text-green-600">Actifs</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm">
              <div className="font-semibold text-red-800 text-lg">{statusCounts.expired}</div>
              <div className="text-red-600">Expirés</div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg border border-red-200 shadow-sm">
              <div className="font-semibold text-red-800 text-lg">{statusCounts.delayed}</div>
              <div className="text-red-600">Retardés</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 shadow-sm">
              <div className="font-semibold text-orange-800 text-lg">{statusCounts.warning}</div>
              <div className="text-orange-600">Attention</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 shadow-sm">
              <div className="font-semibold text-blue-800 text-lg">{statusCounts.processing}</div>
              <div className="text-blue-600">En traitement</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 shadow-sm">
              <div className="font-semibold text-purple-800 text-lg">{statusCounts.recovered}</div>
              <div className="text-purple-600">Récupérés</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher par numéro badge, nom, entreprise..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les types</option>
                  <option value="permanent">Permanents</option>
                  <option value="temporary">Temporaires</option>
                  <option value="recovered">Récupérés</option>
                </select>
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="expired">Expiré</option>
                  <option value="delayed">Retardé</option>
                  <option value="warning">Attention</option>
                  <option value="processing">En traitement</option>
                  {/* REMOVED: recovered from status options since it's a type */}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        {filteredBadges.length !== badges.length && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-700">
              Affichage de {filteredBadges.length} badge(s) sur {badges.length}
            </p>
          </div>
        )}

        {/* Badges List */}
        {error ? (
          <div className="bg-red-50 p-4 rounded-md border border-red-200">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={fetchAllBadges}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        ) : filteredBadges.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {badges.length === 0 ? 'Aucun badge trouvé' : 'Aucun badge ne correspond aux filtres'}
            </h3>
            <p className="text-gray-600">
              {badges.length === 0 ? 'Il n\'y a aucun badge dans le système pour le moment.' : 'Essayez d\'ajuster vos critères de recherche.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBadges.map((badge) => (
              <div 
                key={`${badge.badgeType}-${badge.badgeNumber}`} 
                className={`border-2 rounded-lg overflow-hidden transition-all hover:shadow-lg ${getTypeColor(badge.badgeType)} ${
                  badge.status === 'expired' || badge.status === 'delayed' ? 'ring-2 ring-red-200' : ''
                }`}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(badge)}
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {badge.fullName}
                        </h3>
                        <p className="text-sm text-gray-500">{badge.company}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full font-semibold border ${getStatusColor(badge.status)}`}>
                      {getStatusLabel(badge.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Numéro Badge</span>
                      <span className="font-medium">{badge.badgeNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type</span>
                      <span className="font-medium capitalize">{getTypeLabel(badge.badgeType)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Date création</span>
                      <span className="font-medium">
                        {badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A'}
                      </span>
                    </div>
                    
                    {/* Processing Status Display - Only for non-recovered badges */}
                    {badge.processingStatus && badge.badgeType !== 'recovered' && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Traitement</span>
                        <span className={`font-medium text-xs px-2 py-1 rounded ${
                          badge.processingStatus.status === 'delayed' ? 'bg-red-100 text-red-700' :
                          badge.processingStatus.status === 'warning' ? 'bg-orange-100 text-orange-700' :
                          badge.processingStatus.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {badge.processingStatus.message}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">
                        {badge.badgeType === 'recovered' ? 'Type récupération' : 'Validité'}
                      </span>
                      <span className="font-medium text-xs">
                        {getValidityDisplay(badge)}
                      </span>
                    </div>
                    
                    {/* Validity End Date */}
                    {(badge.badgeType === 'temporary' && badge.validity_end) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valide jusqu'au</span>
                        <span className={`font-medium ${badge.status === 'expired' ? 'text-red-600' : 'text-green-600'}`}>
                          {new Date(badge.validity_end).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                    
                    {badge.badgeType === 'recovered' && badge.recovery_type === 'renouvellement' && badge.validity_end && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valide jusqu'au</span>
                        <span className="font-medium text-green-600">
                          {new Date(badge.validity_end).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className={`px-4 py-3 border-t flex justify-between items-center ${
                  badge.status === 'expired' || badge.status === 'delayed' ? 'bg-red-50 border-red-200' :
                  badge.status === 'warning' ? 'bg-orange-50 border-orange-200' :
                  badge.status === 'active' ? 'bg-green-50 border-green-200' :
                  badge.status === 'recovered' ? 'bg-purple-50 border-purple-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <span className="text-xs text-gray-500 uppercase font-semibold">
                    Badge {getTypeLabel(badge.badgeType)}
                  </span>
                  <Link
                    to={`/admin/badges/${badge.badgeNumber}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Voir détails
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBadgeList;