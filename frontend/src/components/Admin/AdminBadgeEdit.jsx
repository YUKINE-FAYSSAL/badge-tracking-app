import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Upload, 
  File, 
  Download, 
  ArrowLeft, 
  AlertTriangle,
  CheckCircle,
  User,
  Building,
  Hash,
  Calendar,
  Clock,
  Shield,
  Save,
  X,
  Eye,
  Trash2,
  FolderOpen
} from 'lucide-react';

export default function AdminBadgeEdit() {
  const { badgeNum } = useParams();
  const navigate = useNavigate();
  const [badge, setBadge] = useState(null);
  const [pdfFile, setPdfFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [contractExists, setContractExists] = useState(false);

  useEffect(() => {
    fetchBadgeDetails();
  }, [badgeNum]);

  useEffect(() => {
    if (badge) {
      checkContractExists();
    }
  }, [badge]);

  const fetchBadgeDetails = async () => {
    try {
      setFetchLoading(true);
      setError(null);
      
      // Try each endpoint sequentially until we find the badge
      const endpoints = [
        { type: 'permanent', url: `http://localhost:5454/api/badges/permanent/${badgeNum}` },
        { type: 'temporary', url: `http://localhost:5454/api/badges/temporary/${badgeNum}` },
        { type: 'recovered', url: `http://localhost:5454/api/badges/recovered/${badgeNum}` }
      ];
      
      let badgeData = null;
      let foundType = null;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(endpoint.url, { withCredentials: true });
          if (response.status === 200) {
            // Handle different response structures
            if (response.data.badge) {
              badgeData = response.data.badge;
            } else if (response.data.success && response.data.badge) {
              badgeData = response.data.badge;
            } else if (response.data.success) {
              const { success, ...badgeDataWithoutSuccess } = response.data;
              badgeData = badgeDataWithoutSuccess;
            } else {
              badgeData = response.data;
            }
            foundType = endpoint.type;
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!badgeData) {
        throw new Error('Badge not found in any category');
      }
      
      setBadge({ ...badgeData, type: foundType });
      
    } catch (err) {
      setError('Badge not found or failed to load badge details');
    } finally {
      setFetchLoading(false);
    }
  };

  const checkContractExists = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract/exists`,
        { withCredentials: true }
      );
      setContractExists(response.data.exists);
    } catch (err) {
      setContractExists(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const validateAndSetFile = (file) => {
    setError(null);
    
    // Check file type
    if (file.type !== 'application/pdf') {
      setError('Veuillez sélectionner un fichier PDF uniquement');
      return;
    }
    
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('La taille du fichier doit être inférieure à 10MB');
      return;
    }
    
    console.log('File selected:', file.name, file.size, file.type);
    setPdfFile(file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!pdfFile) {
      setError('Veuillez sélectionner un fichier PDF à télécharger');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('contract', pdfFile);

      console.log('Uploading to:', `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract`);
      console.log('File details:', pdfFile.name, pdfFile.size, pdfFile.type);

      const response = await axios.post(
        `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract`,
        formData,
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Upload response:', response.data);

      setSuccess('File téléchargé avec succès');
      setPdfFile(null);
      setContractExists(true);
      
      // Update badge data
      setBadge(prev => ({
        ...prev,
        contract_path: `uploads/${badge.type}/${badge.full_name.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_')}.pdf`,
        contract_filename: `${badge.full_name}.pdf`,
        contract_uploaded_at: new Date().toISOString()
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.message || 'Échec du téléchargement du File';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadExistingContract = async () => {
    try {
      setError(null);
      console.log('Downloading from:', `http://localhost:5454/api/badges/${badge.type}/${badgeNum}/contract`);
      
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
      
      const filename = badge.contract_filename || `${badge.full_name || 'File'}_${badgeNum}.pdf`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download error:', err);
      setError('Échec du téléchargement du File existant');
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

      setSuccess('Fil supprimé avec succès');
      setShowDeleteDialog(false);
      setContractExists(false);
      
      // Update badge data to remove contract information
      setBadge(prev => ({
        ...prev,
        contract_path: null,
        contract_filename: null,
        contract_uploaded_at: null
      }));

      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      console.error('Delete File error:', err);
      setError(err.response?.data?.message || 'Échec de la suppression du File');
      setShowDeleteDialog(false);
    } finally {
      setDeleteLoading(false);
    }
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
      } else if (badge.badge_type === 'temporary') {
        path += 'recover/renouvellement/temporary/';
      } else if (badge.badge_type === 'permanent') {
        path += 'recover/renouvellement/permanent/';
      } else {
        path += 'recover/renouvellement/';
      }
    }
    
    const fullName = badge.full_name || 'unknown';
    const sanitizedName = fullName.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_');
    path += `${sanitizedName}.pdf`;
    
    return path;
  };

  if (fetchLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error && !badge) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin/badges')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Retour aux badges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => navigate('/admin/badges')}
          className="mb-6 flex items-center text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour aux badges
        </button>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className={`${getBadgeTypeColor(badge.type)} px-6 py-4 text-white`}>
            <h1 className="text-2xl font-bold">
              Badge {badge.type?.charAt(0).toUpperCase() + badge.type?.slice(1)} #{badgeNum}
            </h1>
            <p className="text-blue-100 mt-1">Voir les détails du badge et gérer le File</p>
            <div className="mt-2 text-sm bg-black bg-opacity-20 px-3 py-1 rounded-full inline-block">
              <FolderOpen className="inline h-4 w-4 mr-1" />
              Stockage: {getStoragePath()}
            </div>
          </div>

          <div className="p-6">
            {success && (
              <div className="mb-6 p-4 bg-green-100 text-green-700 rounded-md flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                {success}
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-md flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}

            {/* Badge Information - READ ONLY */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations Badge</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Hash className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Numéro Badge</p>
                    <p className="font-medium">{badge.badge_num}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nom Complet</p>
                    <p className="font-medium">{badge.full_name}</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="p-2 bg-gray-100 rounded-full">
                    <Building className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Société</p>
                    <p className="font-medium">{badge.company}</p>
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
            </div>

            {/* Contract Upload Section */}
            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Gestion Des Files</h2>
              
              {/* Existing Contract Section */}
              {(contractExists || badge.contract_path) && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <File className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800">
                          {badge.contract_filename || `${badge.full_name || 'File'}.pdf`}
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
                        type="button"
                        onClick={downloadExistingContract}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteDialog(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {contractExists || badge.contract_path ? 'Remplacer le File' : 'Télécharger un File'}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Le fichier sera sauvegardé comme: <code className="bg-gray-100 px-2 py-1 rounded">{badge.full_name?.replace(/[^\w\s-]/g, '').replace(/[-\s]+/g, '_')}.pdf</code>
                  </p>
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    {pdfFile ? (
                      <div className="flex items-center justify-center space-x-4">
                        <File className="h-8 w-8 text-indigo-600" />
                        <div>
                          <p className="font-medium">{pdfFile.name}</p>
                          <p className="text-xs text-gray-500">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPdfFile(null)}
                          className="text-sm text-red-600 hover:text-red-800 p-1 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className={`mx-auto h-12 w-12 ${dragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {dragActive ? 'Déposer le PDF ici' : 'Télécharger un file PDF'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Glissez-déposez ou cliquez pour sélectionner
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            PDF uniquement, max 10MB
                          </p>
                        </div>
                      </div>
                    )}
                    
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/admin/badges')}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center"
                    disabled={loading}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !pdfFile}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    <span>
                      {contractExists || badge.contract_path ? 'Remplacer le File' : 'Télécharger le File'}
                    </span>
                  </button>
                </div>
              </form>
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
              <h3 className="text-lg font-semibold text-gray-900">Supprimer le file</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Êtes-vous sûr de vouloir supprimer le file pour le badge {badge.badge_num}? 
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
                {deleteLoading ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}