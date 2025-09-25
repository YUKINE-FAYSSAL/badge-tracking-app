import React from 'react';
import { Edit2, Trash2, Clock, CheckCircle, RotateCw } from 'react-feather';

export default function BadgeCard({ badge, type, onDelete, onEdit }) {
  const getIcon = () => {
    switch(type) {
      case 'permanent': return <CheckCircle className="text-blue-500" />;
      case 'temporary': return <Clock className="text-yellow-500" />;
      case 'recovered': return <RotateCw className="text-green-500" />;
      default: return <CheckCircle className="text-blue-500" />;
    }
  };

  const getBadgeColor = () => {
    switch(type) {
      case 'permanent': return 'bg-blue-100 text-blue-800';
      case 'temporary': return 'bg-yellow-100 text-yellow-800';
      case 'recovered': return 'bg-green-100 text-green-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-full bg-opacity-20 mt-1">
            {getIcon()}
          </div>
          <div>
            <h3 className="font-medium">{badge.full_name}</h3>
            <p className="text-sm text-gray-600">Badge #: {badge.badge_num}</p>
            <p className="text-sm text-gray-600">Company: {badge.company}</p>
            
            {type === 'permanent' && (
              <div className="mt-2 space-y-1">
                <p className="text-xs">Validity: {badge.validity_duration}</p>
                <p className="text-xs">Requested: {badge.request_date}</p>
              </div>
            )}
            
            {type === 'temporary' && (
              <div className="mt-2 space-y-1">
                <p className="text-xs">Valid: {badge.validity_start} to {badge.validity_end}</p>
                <p className="text-xs">Requested: {badge.request_date}</p>
              </div>
            )}
            
            {type === 'recovered' && (
              <div className="mt-2 space-y-1">
                <p className="text-xs">Recovered: {badge.recovery_date}</p>
                <p className="text-xs">Type: {badge.recovery_type}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => onEdit(badge.badge_num)}
            className="p-1 text-gray-500 hover:text-blue-500"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={() => onDelete(badge.badge_num)}
            className="p-1 text-gray-500 hover:text-red-500"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}