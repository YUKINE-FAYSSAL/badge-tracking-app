// src/pages/Admin/Badges.jsx
import React, { useState } from 'react';
import AdminBadgeLists from '../../components/Admin/AdminBadgeLists';
import { useTranslation } from '../../hooks/useTranslation';

export default function AdminBadges() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState('');
  const { t } = useTranslation();

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterCompany(e.target.value);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">{t('admin.badgeManagement')}</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t('sidebar.badges')}</h2>
        </div>
        
        <AdminBadgeLists searchTerm={searchTerm} filterCompany={filterCompany} />
      </div>
    </div>
  );
}