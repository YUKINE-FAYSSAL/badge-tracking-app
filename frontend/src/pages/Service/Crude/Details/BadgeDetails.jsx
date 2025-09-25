// BadgeDetails.jsx - Version française
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Badge as BadgeIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  User,
  Building,
  FileText,
  Shield,
  Calendar,
  Download,
  Hash,
  FolderOpen
} from 'lucide-react';

export default function BadgeDetails() {
  const { badgeNum } = useParams();
  const navigate = useNavigate();
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasContract, setHasContract] = useState(false);
  const [checkingContract, setCheckingContract] = useState(true);

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        setLoading(true);
        // Try fetching permanent badge details
        let response = await axios.get(
          `http://localhost:5454/api/badges/permanent/${badgeNum}`,
          { withCredentials: true }
        );

        if (!response.data.badge_num) {
          // If not permanent, try temporary badge
          response = await axios.get(
            `http://localhost:5454/api/badges/temporary/${badgeNum}`,
            { withCredentials: true }
          );

          if (!response.data.badge_num) {
            // If not temporary, try recovered badge
            response = await axios.get(
              `http://localhost:5454/api/badges/recovered/${badgeNum}`,
              { withCredentials: true }
            );
          }
        }

        setBadge(response.data);
        
        // Check if contract exists
        try {
          const badgeType = getBadgeType(response.data).toLowerCase();
          const contractCheck = await axios.get(
            `http://localhost:5454/api/badges/${badgeType}/${badgeNum}/contract/exists`,
            { withCredentials: true }
          );
          setHasContract(contractCheck.data.exists);
        } catch (contractErr) {
          console.log('No contract available for this badge');
          setHasContract(false);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Échec du chargement des détails du badge');
      } finally {
        setLoading(false);
        setCheckingContract(false);
      }
    };

    fetchBadge();
  }, [badgeNum]);

  const getBadgeType = (badgeData) => {
    if (badgeData?.recovery_type) return 'Recovered';
    if (badgeData?.validity_duration) return 'Permanent';
    if (badgeData?.validity_start) return 'Temporary';
    return 'Unknown';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBadgeTypeColor = () => {
    const type = getBadgeType(badge);
    switch (type) {
      case 'Recovered':
        return 'bg-purple-600';
      case 'Temporary':
        return 'bg-blue-600';
      case 'Permanent':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  // UNIFIED STATUS DETERMINATION (same logic as AdminBadgeDetails)
  const determineUnifiedStatus = (badgeData) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // RECOVERED BADGES - Always show as "recovered"
    if (badgeData.recovery_type) {
      return 'recovered';
    }
    
    // For PERMANENT and TEMPORARY badges, check if completed first
    const isCompleted = badgeData.gr_return_date || badgeData.gr_returned;
    
    if (isCompleted) {
      // Badge is completed - check validity
      if (badgeData.validity_duration) {
        // Permanent badge
        const completionDate = new Date(badgeData.gr_return_date);
        completionDate.setHours(0, 0, 0, 0);
        
        let validityEnd;
        const duration = badgeData.validity_duration || '1 year';
        
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
        
      } else if (badgeData.validity_end) {
        // Temporary badge
        const validityEndDate = new Date(badgeData.validity_end);
        validityEndDate.setHours(0, 0, 0, 0);
        return validityEndDate < today ? 'expired' : 'active';
      }
      return 'active';
    } else {
      // Badge NOT completed = ALWAYS "processing"
      return 'processing';
    }
  };

  const getStatusInfo = () => {
    if (!badge) return { status: 'unknown', color: 'text-gray-600', bgColor: 'bg-gray-100', headerGradient: 'bg-gradient-to-r from-gray-500 to-gray-600' };

    const unifiedStatus = determineUnifiedStatus(badge);
    
    switch(unifiedStatus) {
      case 'recovered':
        return {
          status: 'recovered',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          headerGradient: 'bg-gradient-to-r from-purple-500 to-purple-600'
        };
      case 'active':
        return {
          status: 'active',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          headerGradient: 'bg-gradient-to-r from-green-500 to-green-600'
        };
      case 'expired':
        return {
          status: 'expired',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          headerGradient: 'bg-gradient-to-r from-red-500 to-red-600'
        };
      case 'processing':
        return {
          status: 'processing',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          headerGradient: 'bg-gradient-to-r from-blue-500 to-blue-600'
        };
      default:
        return {
          status: 'unknown',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          headerGradient: 'bg-gradient-to-r from-gray-500 to-gray-600'
        };
    }
  };

  const downloadContract = async () => {
    try {
      // Determine badge type for API call
      const badgeType = getBadgeType(badge).toLowerCase();
      const response = await axios.get(
        `http://localhost:5454/api/badges/${badgeType}/${badgeNum}/contract`,
        {
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `contrat_${badgeNum}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Erreur de téléchargement:', err);
    }
  };

  const getBadgeStages = () => {
    if (!badge) return [];
    
    const stages = [];
    if (badge.dgsn_sent_date) stages.push({name: 'Envoyé à DGSN', date: badge.dgsn_sent_date, completed: !!badge.dgsn_return_date});
    if (badge.dgsn_return_date) stages.push({name: 'Retourné DGSN', date: badge.dgsn_return_date, completed: true});
    if (badge.gr_sent_date) stages.push({name: 'Envoyé à GR', date: badge.gr_sent_date, completed: !!badge.gr_return_date});
    if (badge.gr_return_date) stages.push({name: 'Retourné GR', date: badge.gr_return_date, completed: true});
    return stages;
  };

  const getStoragePath = () => {
    if (!badge) return 'N/A';
    
    let path = 'uploads/';
    const badgeType = getBadgeType(badge).toLowerCase();
    
    if (badgeType === 'permanent') {
      path += 'permanent/';
    } else if (badgeType === 'temporary') {
      path += 'temporary/';
    } else if (badgeType === 'recovered') {
      const recoveryType = badge.recovery_type || 'renouvellement';
      if (recoveryType.toLowerCase().includes('décharge')) {
        path += 'recover/decharge/';
      } else {
        path += 'recover/renouvellement/';
      }
    }
    
    const fullName = badge.full_name || 'unknown';
    const sanitizedName = fullName.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_');
    path += `${sanitizedName}.pdf`;
    
    return path;
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'active': return 'Actif';
      case 'expired': return 'Expiré';
      case 'processing': return 'En traitement';
      case 'recovered': return 'Récupéré';
      default: return 'Statut inconnu';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': 
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired': 
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'processing': 
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'recovered': 
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      default: 
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Badge Non Trouvé</h2>
          <p className="text-gray-600 mb-4">Le badge numéro {badgeNum} n'a pas été trouvé.</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </button>
        </div>
      </div>
    );
  }

  const badgeType = getBadgeType(badge);
  const statusInfo = getStatusInfo();
  const badgeStages = getBadgeStages();
  const statusText = getStatusText(statusInfo.status);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour à la liste
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`${getBadgeTypeColor()} px-6 py-4 text-white`}>
            <h1 className="text-2xl font-bold">
              Détails Badge #{badge.badge_num}
            </h1>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4">
                <span className="bg-black bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {badgeType.toUpperCase()}
                </span>
                <div className="flex items-center">
                  {getStatusIcon(statusInfo.status)}
                  <span className="ml-2 text-sm">{statusText}</span>
                </div>
              </div>
            </div>
            <div className="mt-2 text-sm bg-black bg-opacity-20 px-3 py-1 rounded-full inline-block">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              Stockage: {getStoragePath()}
            </div>
          </div>

          <div className="p-6">
            {/* Badge Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Hash className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Numéro Badge</p>
                  <p className="font-medium">{badge.badge_num || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nom Complet</p>
                  <p className="font-medium">{badge.full_name || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Building className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Société</p>
                  <p className="font-medium">{badge.company || 'N/A'}</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="p-2 bg-gray-100 rounded-full">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">CIN</p>
                  <p className="font-medium">{badge.cin || 'N/A'}</p>
                </div>
              </div>
              
              {badgeType === 'Permanent' && (
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Durée de validité</p>
                    <p className="font-medium">{badge.validity_duration || 'Permanent'}</p>
                  </div>
                </div>
              )}
              
              {(badgeType === 'Temporary' || badgeType === 'Recovered') && (
                <>
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valide du</p>
                      <p className="font-medium">{formatDate(badge.validity_start)}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Clock className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valide jusqu'au</p>
                      <p className="font-medium">{formatDate(badge.validity_end)}</p>
                    </div>
                  </div>
                </>
              )}
              
              {badgeType === 'Recovered' && (
                <>
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date récupération</p>
                      <p className="font-medium">{formatDate(badge.recovery_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Shield className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Type récupération</p>
                      <p className="font-medium">{badge.recovery_type || 'N/A'}</p>
                    </div>
                  </div>
                </>
              )}

              {badge.request_date && (
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date demande</p>
                    <p className="font-medium">{formatDate(badge.request_date)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Processing Information */}
            {badgeStages.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="mr-2 h-5 w-5 text-blue-500" />
                  Chronologie du traitement
                </h2>
                <div className="space-y-4">
                  {badgeStages.map((stage, index) => (
                    <div key={index} className="flex items-start">
                      <div className={`flex-shrink-0 rounded-full p-1 ${stage.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                        {stage.completed ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <Clock className="h-5 w-5" />
                        )}
                      </div>
                      <div className="ml-3">
                        <p className={`text-sm font-medium ${stage.completed ? 'text-green-900' : 'text-blue-900'}`}>
                          {stage.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(stage.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contract Section */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Contrat</h2>
              
              {hasContract ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          contrat_{badgeNum}.pdf
                        </p>
                        <p className="text-sm text-green-600">Contrat disponible</p>
                        <p className="text-xs text-green-500 mt-1">
                          <FolderOpen className="inline h-3 w-3 mr-1" />
                          {getStoragePath()}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={downloadContract}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Aucun contrat téléchargé</p>
                      <p className="text-sm text-yellow-600">
                        Le contrat peut être téléchargé vers: {getStoragePath()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Status Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Informations de statut</h3>
              <div className="flex items-center">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                  {statusText}
                </span>
                <p className="ml-3 text-sm text-gray-600">
                  {statusText === 'Actif' && 'Ce badge est actuellement actif et valide.'}
                  {statusText === 'Expiré' && 'Ce badge a expiré et n\'est plus valide.'}
                  {statusText === 'En traitement' && 'Ce badge est actuellement en cours de traitement.'}
                  {statusText === 'Récupéré' && 'Ce badge a été récupéré par le processus de récupération.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}