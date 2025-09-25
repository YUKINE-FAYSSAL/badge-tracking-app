import React from 'react';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle 
} from 'react-feather';

const iconMap = {
  permanent: CheckCircle,
  temporary: Clock,
  recovered: AlertTriangle,
  trend: TrendingUp
};

const colorMap = {
  permanent: 'bg-blue-100 text-blue-800',
  temporary: 'bg-yellow-100 text-yellow-800',
  recovered: 'bg-green-100 text-green-800',
  trend: 'bg-purple-100 text-purple-800'
};

export default function StatCard({ 
  title, 
  value, 
  change, 
  type = 'permanent',
  loading = false 
}) {
  const Icon = iconMap[type] || CheckCircle;
  const colorClass = colorMap[type] || 'bg-blue-100 text-blue-800';

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-200 rounded mt-2 animate-pulse"></div>
          ) : (
            <p className="text-2xl font-bold mt-1">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClass}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      
      {change !== undefined && (
        <div className={`mt-4 text-sm ${
          change >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {change >= 0 ? '↑' : '↓'} {Math.abs(change)}% from last period
        </div>
      )}
    </div>
  );
}