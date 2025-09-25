import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Info } from 'lucide-react';
import axios from 'axios';

export default function TemporaryForm() {
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Calculate processing timeline preview
  const getProcessingPreview = () => {
    if (!formData.request_date) return null;

    const requestDate = new Date(formData.request_date);
    const today = new Date();
    const diffDays = Math.floor((today - requestDate) / (1000 * 60 * 60 * 24));
    
    // Future dates for timeline
    const warningDate = new Date(requestDate);
    warningDate.setDate(warningDate.getDate() + 6);
    
    const criticalDate = new Date(requestDate);
    criticalDate.setDate(criticalDate.getDate() + 9);
    
    const expireDate = new Date(requestDate);
    expireDate.setDate(expireDate.getDate() + 10);

    let status = 'normal';
    let message = `${diffDays} days since request`;
    let color = 'text-blue-600';
    let bg = 'bg-blue-50';

    if (diffDays >= 10) {
      status = 'expired';
      message = `🚨 WILL BE EXPIRED (${diffDays} days)`;
      color = 'text-red-700';
      bg = 'bg-red-50';
    } else if (diffDays >= 9) {
      status = 'critical';
      message = `🚨 WILL BE CRITICAL (${diffDays} days)`;
      color = 'text-red-600';
      bg = 'bg-red-50';
    } else if (diffDays >= 6) {
      status = 'warning';
      message = `⚠️ WILL BE WARNING (${diffDays} days)`;
      color = 'text-orange-600';
      bg = 'bg-orange-50';
    }

    return {
      status,
      message,
      color,
      bg,
      warningDate: warningDate.toLocaleDateString(),
      criticalDate: criticalDate.toLocaleDateString(),
      expireDate: expireDate.toLocaleDateString(),
      diffDays
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await axios.post('http://localhost:5454/api/badges/temporary', formData, { withCredentials: true });
      navigate('/service/temporary');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add temporary badge');
    } finally {
      setLoading(false);
    }
  };

  const processingPreview = getProcessingPreview();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Add Temporary Badge</h1>
          <p className="text-sm text-gray-600 mt-1">Processing deadline: 10 days from request date</p>
        </div>
      </div>

      {/* Processing Timeline Preview */}
      {processingPreview && (
        <div className={`border rounded-lg p-4 ${processingPreview.bg} ${
          processingPreview.status === 'expired' ? 'border-red-200' :
          processingPreview.status === 'critical' ? 'border-red-200' :
          processingPreview.status === 'warning' ? 'border-orange-200' :
          'border-blue-200'
        }`}>
          <div className="flex items-center mb-3">
            {processingPreview.status === 'expired' || processingPreview.status === 'critical' ? (
              <AlertTriangle className={`mr-2 ${processingPreview.color}`} size={20} />
            ) : (
              <Info className={`mr-2 ${processingPreview.color}`} size={20} />
            )}
            <h3 className={`font-semibold ${processingPreview.color}`}>
              Processing Timeline Preview
            </h3>
          </div>
          <div className={`text-sm ${processingPreview.color} mb-3`}>
            <strong>Current Status:</strong> {processingPreview.message}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-orange-100 p-2 rounded">
              <div className="font-semibold text-orange-800">⚠️ Warning Phase</div>
              <div className="text-orange-700">Day 6+ ({processingPreview.warningDate})</div>
            </div>
            <div className="bg-red-100 p-2 rounded">
              <div className="font-semibold text-red-800">🚨 Critical Phase</div>
              <div className="text-red-700">Day 9+ ({processingPreview.criticalDate})</div>
            </div>
            <div className="bg-red-200 p-2 rounded">
              <div className="font-semibold text-red-900">🔴 Expired</div>
              <div className="text-red-800">Day 10+ ({processingPreview.expireDate})</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Badge Information</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Number</label>
              <input
                type="text"
                name="badge_num"
                value={formData.badge_num}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity Start</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Validity End</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Request Date *
                <span className="text-xs text-gray-500 ml-1">(Determines processing timeline)</span>
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">DGSN Sent Date</label>
              <input
                type="date"
                name="dgsn_sent_date"
                value={formData.dgsn_sent_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">DGSN Return Date</label>
              <input
                type="date"
                name="dgsn_return_date"
                value={formData.dgsn_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GR Sent Date</label>
              <input
                type="date"
                name="gr_sent_date"
                value={formData.gr_sent_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GR Return Date</label>
              <input
                type="date"
                name="gr_return_date"
                value={formData.gr_return_date}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-yellow-500"
              />
              <p className="mt-1 text-xs text-gray-500">Must be within 10 days of request date for valid processing</p>
            </div>
          </div>

          <div className="pt-4 flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-yellow-600 text-white py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add Temporary Badge'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/service/temporary')}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}