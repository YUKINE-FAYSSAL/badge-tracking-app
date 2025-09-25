import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function RecoveredEdit() {
  const { badgeNum } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    recovery_date: '',
    recovery_type: '',
    badge_type: '',
    cin: '',
    validity_start: '',
    validity_end: '',
    validity_duration: ''
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [originalBadgeNum, setOriginalBadgeNum] = useState('');

  useEffect(() => {
    const fetchBadge = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5454/api/badges/recovered/${badgeNum}`,
          { withCredentials: true }
        );
        setFormData({
          ...response.data,
          recovery_date: response.data.recovery_date?.slice(0, 10) || '',
          validity_start: response.data.validity_start?.slice(0, 10) || '',
          validity_end: response.data.validity_end?.slice(0, 10) || ''
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

    // Validation for renouvellement
    if (formData.recovery_type === "renouvellement") {
      if (!formData.badge_type) {
        setError("Le type de badge (Temporaire/Permanent) est requis pour le 'renouvellement'");
        setSubmitting(false);
        return;
      }

      if (formData.badge_type === "temporary" && (!formData.validity_start || !formData.validity_end)) {
        setError("Les dates de début et de fin de validité sont requises pour le renouvellement des badges temporaires");
        setSubmitting(false);
        return;
      }

      if (formData.badge_type === "permanent" && !formData.validity_duration) {
        setError("La durée de validité est requise pour le renouvellement des badges permanents");
        setSubmitting(false);
        return;
      }
    }

    try {
      await axios.put(
        `http://localhost:5454/api/badges/recovered/${originalBadgeNum}`,
        formData,
        { withCredentials: true }
      );
      navigate('/service/recovered');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la mise à jour du badge');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Modifier le Badge Récupéré</h1>
      
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
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
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date de Récupération</label>
              <input
                type="date"
                name="recovery_date"
                value={formData.recovery_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type de Récupération</label>
              <select
                name="recovery_type"
                value={formData.recovery_type}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Sélectionner le type</option>
                <option value="renouvellement">Renouvellement</option>
                <option value="annulation">Annulation</option>
                <option value="perte">Perte</option>
                <option value="vol">Vol</option>
                <option value="retraite">Retraite</option>
                <option value="démission">Démission</option>
                <option value="fin de contrat">Fin de contrat</option>
              </select>
            </div>
            {formData.recovery_type === "renouvellement" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type de Badge</label>
                  <select
                    name="badge_type"
                    value={formData.badge_type}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Sélectionner le type</option>
                    <option value="temporary">Temporaire</option>
                    <option value="permanent">Permanent</option>
                  </select>
                </div>
                {formData.badge_type === "temporary" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Début de Validité</label>
                      <input
                        type="date"
                        name="validity_start"
                        value={formData.validity_start}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fin de Validité</label>
                      <input
                        type="date"
                        name="validity_end"
                        value={formData.validity_end}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </>
                )}
                {formData.badge_type === "permanent" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durée de Validité</label>
                    <select
                      name="validity_duration"
                      value={formData.validity_duration}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Sélectionner la durée</option>
                      <option value="1 year">1 An</option>
                      <option value="3 years">3 Ans</option>
                      <option value="5 years">5 Ans</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Mise à jour...' : 'Mettre à jour le Badge Récupéré'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/service/recovered')}
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