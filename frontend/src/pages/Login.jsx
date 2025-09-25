import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Lock, Eye, EyeOff } from 'react-feather';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await login(username, password);
      if (response && response.success) {
        const redirectPath = response.user.role === 'admin' ? '/admin/dashboard' : '/service/dashboard';
        navigate(redirectPath, { replace: true });
      } else {
        setError(response?.message || 'Invalid username or password');
      }
    } catch (err) {
      setError('Server error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/images/login/back.png')"
        }}
      ></div>
      
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative w-full max-w-md p-8 mx-4">
        {/* Glassmorphism card */}
        <div className="backdrop-blur-md bg-black/30 p-8 rounded-3xl border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-6">
              <img 
                src="/assets/images/login/logo.png" 
                alt="Airports of Morocco" 
                className="h-20 w-auto"
              />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Badge Management System
            </h1>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-600/20 border border-red-500/30 text-red-200 rounded-xl text-sm backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0"></div>
                {error}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Username Field */}
              <div className="relative group">
                <label htmlFor="username" className="block text-sm font-medium text-white/90 mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/60 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="relative group">
                <label htmlFor="password" className="block text-sm font-medium text-white/90 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-white/60 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-12 pr-12 py-3 bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 backdrop-blur-sm transition-all duration-200 hover:bg-white/20"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/60 hover:text-blue-400 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white font-semibold rounded-xl shadow-lg hover:from-blue-700/90 hover:to-blue-800/90 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
            >
              <div className="flex items-center justify-center gap-2">
                {loading && (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                )}
                {loading ? 'Signing In...' : 'Sign In'}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-center text-xs text-white/60">
              Office National Des Aéroports - المكتب الوطني للمطارات
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}