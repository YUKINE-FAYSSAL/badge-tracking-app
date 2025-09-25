// src/components/layouts/ServiceLayout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import ServiceSidebar from '../Service/ServiceSidebar';
import Navbar from '../Shared/Navbar';

export default function ServiceLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <ServiceSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}