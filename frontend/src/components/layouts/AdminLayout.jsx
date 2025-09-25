import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '../Admin/AdminSidebar';
import Navbar from '../Shared/Navbar';

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}