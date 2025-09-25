import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Home } from 'react-feather';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-100"></div>
      
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/30 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-lg w-full space-y-8 p-10 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border border-white/20 text-center transform hover:scale-[1.02] transition-all duration-300">
        {/* Animated icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-yellow-400/20 rounded-full animate-ping"></div>
            <AlertTriangle className="h-20 w-20 text-yellow-500 relative z-10" />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-4">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page Non Trouvée</h2>
          <p className="text-gray-600 leading-relaxed">
            Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
            Vous pouvez retourner à la page de connexion en cliquant sur le bouton ci-dessous.
          </p>
        </div>

        {/* Action button */}
        <div className="pt-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200"
          >
            <Home className="h-5 w-5" />
            Retour à la Connexion
          </Link>
        </div>

        {/* Footer note */}
        <div className="pt-6 border-t border-gray-200/50">
          <p className="text-sm text-gray-500">
            Office National Des Aéroports - Système de Gestion des Badges
          </p>
        </div>
      </div>
    </div>
  );
}