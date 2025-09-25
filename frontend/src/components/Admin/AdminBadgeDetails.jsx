// Fixed AdminBadgeDetails.jsx with unified status logic
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {  
  Edit, 
  User, 
  Building, 
  Hash, 
  Calendar, 
  Clock,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  File,
  Download,
  FolderOpen,
  ArrowLeft,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

const AdminBadgeDetails = () => {
  const { badgeNum } = useParams();
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    fetchBadgeDetails();
  }, [badgeNum]);

  // UNIFIED STATUS DETERMINATION (same logic as AdminBadgeList)
  const determineUnifiedStatus = (badgeData, type) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // RECOVERED BADGES - Always show as "recovered"
    if (type === 'recovered') {
      return 'recovered';
    }
    
    // For PERMANENT and TEMPORARY badges, check if completed first
    const isCompleted = badgeData.gr_return_date || badgeData.gr_returned;
    
    if (isCompleted) {
      // Badge is completed - check validity
      if (type === 'permanent') {
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
        
      } else if (type === 'temporary') {
        if (badgeData.validity_end) {
          const validityEndDate = new Date(badgeData.validity_end);
          validityEndDate.setHours(0, 0, 0, 0);
          return validityEndDate < today ? 'expired' : 'active';
        }
        return 'active';
      }
    } else {
      // Badge NOT completed = ALWAYS "processing"
      return 'processing';
    }
    
    return 'processing';
  };

  // Get processing status details (for display purposes)
  const getProcessingStatus = (badgeData, type) => {
    if (type === 'recovered') {
      return { status: 'recovered', days: 0, message: 'Récupéré' };
    }
    
    const requestDate = badgeData.request_date || badgeData.requestDate;
    if (!requestDate) {
      return { status: 'no-date', days: 0, message: 'N/A' };
    }

    const reqDate = new Date(requestDate);
    reqDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if badge is completed
    if (badgeData.gr_return_date || badgeData.gr_returned) {
      const completionDate = new Date(badgeData.gr_return_date);
      const processingDays = Math.floor((completionDate - reqDate) / (1000 * 60 * 60 * 24));
      
      return { 
        status: 'completed', 
        days: processingDays, 
        message: `Terminé (${processingDays}j)` 
      };
    }
    
    // Active processing
    const daysSinceRequest = Math.floor((today - reqDate) / (1000 * 60 * 60 * 24));
    
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

  // Enhanced normalizeBadgeData function with UNIFIED status
  const normalizeBadgeData = (badgeData, type) => {
    // Use unified status determination
    const unifiedStatus = determineUnifiedStatus(badgeData, type);
    const processingStatus = getProcessingStatus(badgeData, type);

    return {
      badge_num: badgeData.badge_num || badgeData.badgeNumber || badgeNum,
      full_name: badgeData.full_name || badgeData.fullName || 'Unknown',
      company: badgeData.company || 'N/A',
      cin: badgeData.cin || 'N/A',
      validity_duration: badgeData.validity_duration || badgeData.validityDuration || 'Permanent',
      validity_start: badgeData.validity_start || badgeData.validityStart,
      validity_end: badgeData.validity_end || badgeData.validityEnd,
      recovery_date: badgeData.recovery_date || badgeData.recoveryDate,
      recovery_type: badgeData.recovery_type || badgeData.recoveryType,
      request_date: badgeData.request_date || badgeData.requestDate,
      contract_path: badgeData.contract_path || badgeData.contractPath,
      contract_filename: badgeData.contract_filename || badgeData.contractFilename,
      contract_uploaded_at: badgeData.contract_uploaded_at || badgeData.contractUploadedAt,
      gr_return_date: badgeData.gr_return_date,
      gr_returned: badgeData.gr_returned,
      // UNIFIED STATUS
      status: unifiedStatus,
      type: type,
      // Processing status for detailed display
      processingStatus: processingStatus
    };
  };

  const fetchBadgeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try all badge types
      const responses = await Promise.allSettled([
        axios.get(`http://localhost:5454/api/badges/permanent/${badgeNum}`, { withCredentials: true }),
        axios.get(`http://localhost:5454/api/badges/temporary/${badgeNum}`, { withCredentials: true }),
        axios.get(`http://localhost:5454/api/badges/recovered/${badgeNum}`, { withCredentials: true })
      ]);
      
      // Find the first successful response
      const foundIndex = responses.findIndex(res => 
        res.status === 'fulfilled' && res.value.status === 200
      );
      
      if (foundIndex === -1) {
        throw new Error('Badge not found');
      }
      
      const types = ['permanent', 'temporary', 'recovered'];
      const successfulResponse = responses[foundIndex].value;
      
      // Handle different response structures
      let badgeData;
      if (successfulResponse.data.badge) {
        badgeData = successfulResponse.data.badge;
      } else if (successfulResponse.data.success && successfulResponse.data.badge) {
        badgeData = successfulResponse.data.badge;
      } else if (successfulResponse.data.success) {
        const { success, ...badgeDataWithoutSuccess } = successfulResponse.data;
        badgeData = badgeDataWithoutSuccess;
      } else {
        badgeData = successfulResponse.data;
      }
      
      // Normalize with unified status logic
      const normalizedBadge = normalizeBadgeData(badgeData, types[foundIndex]);
      
      console.log('Normalized Badge with Unified Status:', normalizedBadge);
      
      setBadge(normalizedBadge);
    } catch (err) {
      setError('Failed to load badge details');
      console.error('Error fetching badge details:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadContract = async () => {
    try {
      setError(null);
      const response = await axios.get(
        `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract`,
        { 
          withCredentials: true,
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      const filename = badge.contract_filename || 
                      `${badge.full_name || 'contract'}_${badgeNum}.pdf`;
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download contract error:', err);
      setError('Failed to download contract');
    }
  };

  const handleDeleteContract = async () => {
    try {
      setDeleteLoading(true);
      setError(null);

      await axios.delete(
        `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract`,
        { withCredentials: true }
      );

      setSuccess('Contract deleted successfully');
      setShowDeleteDialog(false);
      
      setBadge(prev => ({
        ...prev,
        contract_path: null,
        contract_filename: null,
        contract_uploaded_at: null
      }));

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Delete contract error:', err);
      setError(err.response?.data?.message || 'Failed to delete contract');
      setShowDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  // FIXED: Status icon with unified logic
  const getStatusIcon = (status) => {
    switch(status) {
      case 'active': 
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'expired': 
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing': 
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'recovered': 
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      default: 
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBadgeTypeColor = (type) => {
    switch(type) {
      case 'permanent': return 'bg-green-600';
      case 'temporary': return 'bg-blue-600';
      case 'recovered': return 'bg-purple-600';
      default: return 'bg-gray-600';
    }
  };

  const getStoragePath = () => {
    if (!badge) return 'N/A';
    
    let path = 'uploads/';
    if (badge.type === 'permanent') {
      path += 'permanent/';
    } else if (badge.type === 'temporary') {
      path += 'temporary/';
    } else if (badge.type === 'recovered') {
      const recoveryType = badge.recovery_type || 'renouvellement';
      if (recoveryType.toLowerCase().includes('décharge') || recoveryType.toLowerCase().includes('decharge')) {
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return dateString;
    }
  };

  // FIXED: Status text with French labels
  const getStatusText = (status) => {
    switch(status) {
      case 'active': 
        return 'Actif';
      case 'expired': 
        return 'Expiré';
      case 'processing': 
        return 'En traitement';
      case 'recovered': 
        return 'Récupéré';
      default: 
        return status || 'Inconnu';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && !badge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/admin/badges"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux badges
          </Link>
        </div>
      </div>
    );
  }

  if (!badge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Badge Non Trouvé</h2>
          <p className="text-gray-600 mb-4">Le badge numéro {badgeNum} n'a pas été trouvé.</p>
          <Link
            to="/admin/badges"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux badges
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to="/admin/badges"
          className="mb-6 inline-flex items-center text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour aux badges
        </Link>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`${getBadgeTypeColor(badge.type)} px-6 py-4 text-white`}>
            <h1 className="text-2xl font-bold">
              Détails Badge #{badge.badge_num}
            </h1>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4">
                <span className="bg-black bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {badge.type ? badge.type.charAt(0).toUpperCase() + badge.type.slice(1) : 'Unknown'}
                </span>
                <div className="flex items-center">
                  {getStatusIcon(badge.status)}
                  <span className="ml-2 text-sm">{getStatusText(badge.status)}</span>
                </div>
                {/* Show processing details for non-recovered badges */}
                {badge.type !== 'recovered' && badge.processingStatus && (
                  <span className="bg-black bg-opacity-20 text-white px-2 py-1 rounded text-xs">
                    {badge.processingStatus.message}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-2 text-sm bg-black bg-opacity-20 px-3 py-1 rounded-full inline-block">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              Stockage: {getStoragePath()}
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mx-6 mt-6 p-4 bg-green-100 text-green-700 rounded-md flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}

          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

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
              
              {badge.type === 'permanent' && (
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
              
              {(badge.type === 'temporary' || badge.type === 'recovered') && (
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
              
              {badge.type === 'recovered' && (
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

            {/* Contract Section */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations Contrat</h2>
              
              {badge.contract_path ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          {badge.contract_filename || `${badge.full_name || 'contract'}.pdf`}
                        </p>
                        <p className="text-sm text-green-600">Contrat disponible</p>
                        <p className="text-xs text-green-500 mt-1">
                          <FolderOpen className="inline h-3 w-3 mr-1" />
                          {getStoragePath()}
                        </p>
                        {badge.contract_uploaded_at && (
                          <p className="text-xs text-green-500">
                            Téléchargé: {formatDate(badge.contract_uploaded_at)}
                          </p>
                        )}
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
                      <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="h-8 w-8 text-yellow-600" />
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

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <Link
                to={`/admin/badges/edit/${badgeNum}`}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center transition-colors"
              >
                <Edit className="h-4 w-4 mr-2" />
                Modifier Badge
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">Supprimer Contrat</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le contrat pour le badge {badge.badge_num}? 
              Cette action est irréversible et supprimera définitivement le fichier PDF du serveur.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteContract}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                {deleteLoading ? 'Suppression...' : 'Supprimer Contrat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBadgeDetails;