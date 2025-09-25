import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, XCircle, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

export default function TemporaryEdit() {
  const { badgeNum } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    cin: '',
    validity_start: '',
    validity_end: '',
    request_date: '',
    dgsn_sent_date: '',
    dgsn_return_date: '',
    gr_sent_date: '',
    gr_return_date: '',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [originalBadgeNum, setOriginalBadgeNum] = useState('');

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const response = await axios.get(`http://localhost:5454/api/badges/temporary/${badgeNum}`, { withCredentials: true });
        const badge = response.data.badge;
        setFormData({
          badge_num: badge.badge_num || '',
          full_name: badge.full_name || '',
          company: badge.company || '',
          cin: badge.cin || '',
          validity_start: badge.validity_start?.slice(0, 10) || '',
          validity_end: badge.validity_end?.slice(0, 10) || '',
          request_date: badge.request_date?.slice(0, 10) || '',
          dgsn_sent_date: badge.dgsn_sent_date?.slice(0, 10) || '',
          dgsn_return_date: badge.dgsn_return_date?.slice(0, 10) || '',
          gr_sent_date: badge.gr_sent_date?.slice(0, 10) || '',
          gr_return_date: badge.gr_return_date?.slice(0, 10) || '',
        });
        setOriginalBadgeNum(badge.badge_num);
      } catch (err) {
        setError(err.response?.data?.message || 'Échec de la récupération du badge');
      } finally {
        setLoading(false);
      }
    };
    fetchBadge();
  }, [badgeNum]);

  // Enhanced function to calculate processing status
  const getProcessingStatus = () => {
    if (!formData.request_date) {
      return { 
        days: 0, 
        status: 'no-date', 
        color: 'text-gray-600', 
        bg: 'bg-gray-100',
        message: 'Aucune date de demande',
        icon: Clock,
        iconColor: 'text-gray-600'
      };
    }

    const requestDate = new Date(formData.request_date);
    const today = new Date();
    const diffDays = Math.floor((today - requestDate) / (1000 * 60 * 60 * 24));

    // If already processed (has gr_return_date)
    if (formData.gr_return_date) {
      const returnDate = new Date(formData.gr_return_date);
      const processingDays = Math.floor((returnDate - requestDate) / (1000 * 60 * 60 * 24));
      if (processingDays > 10) {
        return { 
          days: processingDays, 
          status: 'completed-invalid', 
          color: 'text-red-600', 
          bg: 'bg-red-100',
          message: `Invalide (${processingDays} jours)`,
          icon: XCircle,
          iconColor: 'text-red-600'
        };
      }
      return { 
        days: processingDays, 
        status: 'completed', 
        color: 'text-green-600', 
        bg: 'bg-green-100',
        message: `Complet (${processingDays} jours)`,
        icon: CheckCircle,
        iconColor: 'text-green-600'
      };
    }

    // Active processing status
    if (diffDays >= 10) {
      return { 
        days: diffDays, 
        status: 'expired', 
        color: 'text-red-700', 
        bg: 'bg-red-200',
        message: `🚨 EXPIRÉ (${diffDays} jours)`,
        icon: XCircle,
        iconColor: 'text-red-700'
      };
    } else if (diffDays >= 9) {
      return { 
        days: diffDays, 
        status: 'critical', 
        color: 'text-red-600', 
        bg: 'bg-red-100',
        message: `🚨 CRITIQUE (${diffDays} jours)`,
        icon: AlertTriangle,
        iconColor: 'text-red-600'
      };
    } else if (diffDays >= 6) {
      return { 
        days: diffDays, 
        status: 'warning', 
        color: 'text-orange-600', 
        bg: 'bg-orange-100',
        message: `⚠️ ATTENTION (${diffDays} jours)`,
        icon: AlertTriangle,
        iconColor: 'text-orange-600'
      };
    } else {
      return { 
        days: diffDays, 
        status: 'normal', 
        color: 'text-blue-600', 
        bg: 'bg-blue-100',
        message: `${diffDays} jours`,
        icon: Clock,
        iconColor: 'text-blue-600'
      };
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await axios.put(`http://localhost:5454/api/badges/temporary/${originalBadgeNum}`, formData, { withCredentials: true });
      navigate('/service/temporary');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour du badge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
      </div>
    );
  }

  if (error && !formData.badge_num) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const processingStatus = getProcessingStatus();
  const StatusIcon = processingStatus.icon;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Processing Status Alert */}
      {['expired', 'critical', 'warning'].includes(processingStatus.status) && (
        <div className={`border rounded-lg p-4 ${
          processingStatus.status === 'expired' ? 'bg-red-50 border-red-200' :
          processingStatus.status === 'critical' ? 'bg-red-50 border-red-200' :
          'bg-orange-50 border-orange-200'
        }`}>
          <div className="flex items-center">
            <StatusIcon className={`mr-2 ${processingStatus.iconColor} ${
              processingStatus.status === 'expired' || processingStatus.status === 'critical' ? 'animate-pulse' : ''
            }`} size={20} />
            <h3 className={`font-semibold ${
              processingStatus.status === 'expired' ? 'text-red-800' :
              processingStatus.status === 'critical' ? 'text-red-700' :
              'text-orange-800'
            }`}>
              {processingStatus.status === 'expired' ? '🚨 TRAITEMENT DU BADGE EXPIRÉ' :
               processingStatus.status === 'critical' ? '🚨 CRITIQUE : LE BADGE EXPIRE DEMAIN' :
               '⚠️ ATTENTION : RETARD DE TRAITEMENT DU BADGE'}
            </h3>
          </div>
          <p className={`mt-1 text-sm ${
            processingStatus.status === 'expired' ? 'text-red-700' :
            processingStatus.status === 'critical' ? 'text-red-600' :
            'text-orange-700'
          }`}>
            {processingStatus.message} - Action immédiate requise
          </p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Modifier le Badge Temporaire</h1>
          <div className="flex items-center mt-2">
            <StatusIcon className={`mr-2 ${processingStatus.iconColor}`} size={16} />
            <span className={`text-sm font-medium ${processingStatus.color}`}>
              Statut de traitement: {processingStatus.message}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de Badge</label>
              <input
                type="text"
                name="badge_num"
                value={formData.badge_num}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Le numéro doit être unique</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entreprise</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
              <input
                type="text"
                name="cin"
                value={formData.cin}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Début de Validité</label>
              <input
                type="date"
                name="validity_start"
                value={formData.validity_start}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fin de Validité</label>
              <input
                type="date"
                name="validity_end"
                value={formData.validity_end}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Demande</label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'Envoi DGSN</label>
              <input
                type="date"
                name="dgsn_sent_date"
                value={formData.dgsn_sent_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Retour DGSN</label>
              <input
                type="date"
                name="dgsn_return_date"
                value={formData.dgsn_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'Envoi GR</label>
              <input
                type="date"
                name="gr_sent_date"
                value={formData.gr_sent_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Retour GR</label>
              <input
                type="date"
                name="gr_return_date"
                value={formData.gr_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-gray-500">Doit être dans les 10 jours suivant la date de demande</p>
            </div>
          </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à jour le Badge Temporaire'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/service/temporary')}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}