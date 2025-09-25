import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function BadgeForm({ badgeType, onSubmit, initialData = null, isEdit = false }) {
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    ...(badgeType === 'permanent' && {
      validity_duration: '1 year',
      request_date: '',
      dgsn_sent_date: '',
      dgsn_return_date: '',
      gr_sent_date: '',
      gr_return_date: ''
    }),
    ...(badgeType === 'temporary' && {
      validity_start: '',
      validity_end: '',
      request_date: '',
      dgsn_sent_date: '',
      dgsn_return_date: '',
      gr_sent_date: '',
      gr_return_date: ''
    }),
    ...(badgeType === 'recovered' && {
      recovery_date: '',
      recovery_type: ''
    })
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(formData);
      navigate(`/service/${badgeType}`);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">
        {isEdit ? 'Edit' : 'Add'} {badgeType} Badge
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Common fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
            <input
              type="text"
              name="badge_num"
              value={formData.badge_num}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
              disabled={isEdit}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
            <input
              type="text"
              name="company"
              value={formData.company}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          {/* Type-specific fields */}
          {badgeType === 'permanent' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validity Duration</label>
                <select
                  name="validity_duration"
                  value={formData.validity_duration}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="1 year">1 Year</option>
                  <option value="2 years">2 Years</option>
                  <option value="3 years">3 Years</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
                <input
                  type="date"
                  name="request_date"
                  value={formData.request_date}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </>
          )}

          {badgeType === 'temporary' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                <input
                  type="date"
                  name="validity_start"
                  value={formData.validity_start}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  name="validity_end"
                  value={formData.validity_end}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
            </>
          )}

          {badgeType === 'recovered' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Date</label>
                <input
                  type="date"
                  name="recovery_date"
                  value={formData.recovery_date}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recovery Type</label>
                <select
                  name="recovery_type"
                  value={formData.recovery_type}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select type</option>
                  <option value="renouvellement">Renouvellement</option>
                  <option value="décharge">Décharge</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-md text-white ${
              badgeType === 'permanent' ? 'bg-blue-600 hover:bg-blue-700' :
              badgeType === 'temporary' ? 'bg-yellow-600 hover:bg-yellow-700' :
              'bg-green-600 hover:bg-green-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Submitting...' : `${isEdit ? 'Update' : 'Add'} ${badgeType} Badge`}
          </button>
        </div>
      </form>
    </div>
  );
}