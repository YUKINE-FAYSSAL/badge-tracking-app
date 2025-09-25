// src/pages/Service/PermanentForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function PermanentForm() {
  const [formData, setFormData] = useState({
    badge_num: '',
    full_name: '',
    company: '',
    validity_duration: '1 year',
    request_date: '',
    dgsn_sent_date: '',
    dgsn_return_date: '',
    gr_sent_date: '',
    gr_return_date: '',
    cin: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5454/api/badges/permanent', formData, { withCredentials: true });
      navigate('/service/permanent');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add permanent badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Add Permanent Badge</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
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
              className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
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
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            />
          </div>
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
              <option value="3 years">3 Years</option>
              <option value="5 years">5 Years</option>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DGSN Sent Date</label>
            <input
              type="date"
              name="dgsn_sent_date"
              value={formData.dgsn_sent_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DGSN Return Date</label>
            <input
              type="date"
              name="dgsn_return_date"
              value={formData.dgsn_return_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GR Sent Date</label>
            <input
              type="date"
              name="gr_sent_date"
              value={formData.gr_sent_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GR Return Date</label>
            <input
              type="date"
              name="gr_return_date"
              value={formData.gr_return_date}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <p className="mt-1 text-xs text-gray-500">Must be within 10 days of request date</p>
          </div>
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Permanent Badge'}
          </button>
        </div>
      </form>
    </div>
  );
}