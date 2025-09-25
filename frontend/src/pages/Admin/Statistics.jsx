import React from 'react';
import AdminStats from '../../components/Admin/AdminStats';

export default function AdminStatistics() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Statistics</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <AdminStats />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Monthly Trends</h2>
          {/* Additional charts can be added here */}
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Yearly Overview</h2>
          {/* Additional charts can be added here */}
        </div>
      </div>
    </div>
  );
}