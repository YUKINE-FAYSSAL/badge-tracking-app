// src/pages/Service/Crude/Recovered/RecoveredForm.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function RecoveredForm() {
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    recovery_date: '',
    recovery_type: '',
    badge_type: '', // New field for temporary/permanent
    cin: '',
    validity_start: '',
    validity_end: '',
    validity_duration: '' // For permanent badges (1 year, 3 years, 5 years)
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  // Frontend validation
  if (formData.recovery_type === "renouvellement") {
    if (!formData.badge_type) {
      setError("Badge type (Temporary/Permanent) is required for 'renouvellement'");
      setLoading(false);
      return;
    }

    if (formData.badge_type === "temporary") {
      if (!formData.validity_start || !formData.validity_end) {
        setError("Validity start and end dates are required for temporary badge renewal");
        setLoading(false);
        return;
      }
      
      // Check if end date is after start date
      if (new Date(formData.validity_start) >= new Date(formData.validity_end)) {
        setError("Validity end date must be after start date");
        setLoading(false);
        return;
      }
    }

    if (formData.badge_type === "permanent" && !formData.validity_duration) {
      setError("Validity duration is required for permanent badge renewal");
      setLoading(false);
      return;
    }
    }

    try {
      // Send POST request to backend
      const response = await axios.post('http://localhost:5454/api/badges/recovered', formData, {
        withCredentials: true
      });

      navigate('/service/recovered');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add recovered badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add Recovered Badge</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
            <input
              type="text"
              name="badge_num"
              value={formData.badge_num}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Date</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Type</label>
            <select
              name="recovery_type"
              value={formData.recovery_type}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="">Select recovery type</option>
              <option value="renouvellement">Renouvellement</option>
              <option value="décharge">Décharge</option>
            </select>
          </div>

          {formData.recovery_type === 'renouvellement' && (
            <>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Badge Type</label>
                <select
                  name="badge_type"
                  value={formData.badge_type}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select badge type</option>
                  <option value="temporary">Temporary</option>
                  <option value="permanent">Permanent</option>
                </select>
              </div>

              {formData.badge_type === 'temporary' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validity From</label>
                    <input
                      type="date"
                      name="validity_start"
                      value={formData.validity_start}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Validity Until</label>
                    <input
                      type="date"
                      name="validity_end"
                      value={formData.validity_end}
                      onChange={handleChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                      required
                    />
                  </div>
                </>
              )}

              {formData.badge_type === 'permanent' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Validity Duration</label>
                  <select
                    name="validity_duration"
                    value={formData.validity_duration}
                    onChange={handleChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">Select validity duration</option>
                    <option value="1 year">1 Year</option>
                    <option value="3 years">3 Years</option>
                    <option value="5 years">5 Years</option>
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Adding...' : 'Add Recovered Badge'}
          </button>
        </div>
      </form>
    </div>
  );
}