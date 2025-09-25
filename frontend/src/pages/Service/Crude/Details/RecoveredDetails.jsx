// RecoveredDetails.jsx - Version française
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Badge as BadgeIcon, 
  AlertTriangle, 
  Calendar,
  Clock,
  User,
  Building,
  FileText,
  Shield,
  RefreshCw,
  Download,
  Hash,
  FolderOpen,
  CheckCircle
} from 'lucide-react';

export default function RecoveredDetails() {
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
        const response = await axios.get(
          `http://localhost:5454/api/badges/recovered/${badgeNum}`,
          { withCredentials: true }
        );
        setBadge(response.data);

        // Check if contract exists
        try {
          const contractCheck = await axios.get(
            `http://localhost:5454/api/badges/recovered/${badgeNum}/contract/exists`,
            { withCredentials: true }
          );
          setHasContract(contractCheck.data.exists);
        } catch (err) {
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRecoveryTypeColor = (type) => {
    switch (type) {
      case 'renouvellement':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'décharge':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBadgeTypeColor = (type) => {
    switch (type) {
      case 'temporary':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'permanent':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const downloadContract = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5454/api/badges/recovered/${badgeNum}/contract`,
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
      console.error('Échec du téléchargement du contrat:', err);
    }
  };

  const getStoragePath = () => {
    if (!badge) return 'N/A';
    
    let path = 'uploads/recover/';
    const recoveryType = badge.recovery_type || 'renouvellement';
    
    if (recoveryType.toLowerCase().includes('décharge')) {
      path += 'decharge/';
    } else {
      path += 'renouvellement/';
      if (badge.badge_type === 'temporary') {
        path += 'temporary/';
      } else if (badge.badge_type === 'permanent') {
        path += 'permanent/';
      }
    }
    
    const fullName = badge.full_name || 'unknown';
    const sanitizedName = fullName.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_');
    path += `${sanitizedName}.pdf`;
    
    return path;
  };

  const getRecoveryDisplay = (badge) => {
    if (badge.recovery_type === 'décharge') {
      return 'Décharge';
    } else if (badge.recovery_type === 'renouvellement') {
      return badge.badge_type ? `Renouvellement (${badge.badge_type})` : 'Renouvellement';
    }
    return badge.recovery_type || 'Récupération';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
          <div className="bg-purple-600 px-6 py-4 text-white">
            <h1 className="text-2xl font-bold">
              Détails Badge #{badge.badge_num}
            </h1>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4">
                <span className="bg-black bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  RÉCUPÉRÉ
                </span>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-white" />
                  <span className="ml-2 text-sm">Récupéré</span>
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
                  <RefreshCw className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type récupération</p>
                  <p className="font-medium">{getRecoveryDisplay(badge)}</p>
                </div>
              </div>

              {badge.recovery_type === 'renouvellement' && badge.badge_type && (
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Shield className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type de badge</p>
                    <p className="font-medium capitalize">{badge.badge_type}</p>
                  </div>
                </div>
              )}

              {badge.recovery_type === 'renouvellement' && badge.badge_type === 'temporary' && (
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

                  {badge.validity_start && badge.validity_end && (
                    <div className="flex items-start space-x-4">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <Clock className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Durée</p>
                        <p className="font-medium">
                          {Math.ceil((new Date(badge.validity_end) - new Date(badge.validity_start)) / (1000 * 60 * 60 * 24))} jours
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {badge.recovery_type === 'renouvellement' && badge.badge_type === 'permanent' && (
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Shield className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Durée de validité</p>
                    <p className="font-medium">{badge.validity_duration || 'Permanent'}</p>
                  </div>
                </div>
              )}
            </div>

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

            {/* Décharge Information */}
            {badge.recovery_type === 'décharge' && (
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Informations Décharge
                </h2>
                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Processus Décharge</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Ce badge a été traité par la procédure de décharge. 
                      Le badge physique a été retourné et la récupération documentée.
                    </p>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> La décharge indique que le badge a été officiellement 
                        retourné et retiré de la circulation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status Information */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Informations de statut</h3>
              <div className="flex items-center">
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  Récupéré
                </span>
                <p className="ml-3 text-sm text-gray-600">
                  Ce badge a été récupéré par le processus de récupération.
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Informations système</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500">
                <div>Créé: {badge.created_at ? formatDate(badge.created_at) : 'N/A'}</div>
                <div>Créé par: {badge.created_by || 'N/A'}</div>
                {badge.updated_at && (
                  <>
                    <div>Dernière mise à jour: {formatDate(badge.updated_at)}</div>
                    <div>Mis à jour par: {badge.updated_by || 'N/A'}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}