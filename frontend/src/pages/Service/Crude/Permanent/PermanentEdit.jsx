import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PermanentEdit() {
  const { badgeNum } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    validity_duration: '',
    request_date: '',
    dgsn_sent_date: '',
    dgsn_return_date: '',
    gr_sent_date: '',
    gr_return_date: '',
    cin: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [originalBadgeNum, setOriginalBadgeNum] = useState('');

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5454/api/badges/permanent/${badgeNum}`,
          { withCredentials: true }
        );
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          try {
            const date = new Date(dateStr);
            return date.toISOString().slice(0, 10);
          } catch {
            return '';
          }
        };

        setFormData({
          ...response.data,
          request_date: formatDate(response.data.request_date),
          dgsn_sent_date: formatDate(response.data.dgsn_sent_date),
          dgsn_return_date: formatDate(response.data.dgsn_return_date),
          gr_sent_date: formatDate(response.data.gr_sent_date),
          gr_return_date: formatDate(response.data.gr_return_date)
        });
        setOriginalBadgeNum(response.data.badge_num);
      } catch (err) {
        setError(err.response?.data?.message || 'Échec de la récupération du badge');
      } finally {
        setLoading(false);
      }
    };

    fetchBadge();
  }, [badgeNum]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await axios.put(
        `http://localhost:5454/api/badges/permanent/${originalBadgeNum}`,
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      navigate('/service/permanent');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour du badge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800">Modifier le Badge Permanent</h1>
      
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">Le numéro doit être unique</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CIN</label>
              <input
                type="text"
                name="cin"
                value={formData.cin}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom Complet</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durée de Validité</label>
              <select
                name="validity_duration"
                value={formData.validity_duration}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Sélectionner la durée de validité</option>
                <option value="1 year">1 An</option>
                <option value="3 years">3 Ans</option>
                <option value="5 years">5 Ans</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Demande</label>
              <input
                type="date"
                name="request_date"
                value={formData.request_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Retour DGSN</label>
              <input
                type="date"
                name="dgsn_return_date"
                value={formData.dgsn_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date d'Envoi GR</label>
              <input
                type="date"
                name="gr_sent_date"
                value={formData.gr_sent_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Retour GR</label>
              <input
                type="date"
                name="gr_return_date"
                value={formData.gr_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Doit être dans les 10 jours suivant la date de demande</p>
            </div>
          </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à jour le Badge Permanent'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/service/permanent')}
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