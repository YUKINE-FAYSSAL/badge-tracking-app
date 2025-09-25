// src/components/Shared/BadgeList.jsx
import React, { useState } from 'react';
import BadgeCard from '../Shared/BadgeCard';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function BadgeList({ badges = [], badgeType, onRefresh }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async (badgeNum) => {
    try {
      setLoading(true);
      setError(null);
      await axios.delete(
        `http://localhost:5454/api/badges/${badgeType}/${badgeNum}`,
        { withCredentials: true }
      );
      onRefresh();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete badge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <h2 className="text-xl font-bold capitalize">
          {badgeType} Badges ({badges.length})
        </h2>
        <div className="flex space-x-2">
          <Link
            to={`/service/${badgeType}/new`}
            className="px-3 py-1 bg-white text-indigo-600 rounded text-sm hover:bg-gray-100 transition-colors"
          >
            Add New
          </Link>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-3 py-1 bg-white text-indigo-600 rounded text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-100 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {badges.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No {badgeType} badges found
          </div>
        ) : (
          badges.map((badge) => (
            <BadgeCard
              key={badge.badge_num || badge._id}
              badge={badge}
              type={badgeType}
              onDelete={user?.role === 'admin' ? handleDelete : null}
              onEdit={`/service/${badgeType}/edit/${badge.badge_num}`}
            />
          ))
        )}
      </div>
    </div>
  );
}