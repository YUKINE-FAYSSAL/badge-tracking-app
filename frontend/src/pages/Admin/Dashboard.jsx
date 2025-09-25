import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  Download, Calendar, TrendingUp, RotateCw, AlertTriangle, Clock, 
  Shield, Building, FileText, BarChart2, Users, PlusCircle, CheckCircle,
  XCircle, PlayCircle, AlertCircleIcon, Timer
} from 'lucide-react';

export default function DashboardFrancais() {
  const [data, setData] = useState({
    stats: {
      permanent_by_month: [],
      temporary_by_month: [],
      recovered_by_month: [],
      permanent_by_year: [],
      temporary_by_year: [],
      recovered_by_year: []
    },
    summary: {
      total_all: 0,
      total_permanent: 0,
      total_temporary: 0,
      total_recovered: 0,
      valid_badges: 0,
      expired_badges: 0,
      processing_badges: 0,
      delayed_badges: 0,
      expiring_soon: 0,
      companies: 0,
      avg_processing_time: 0,
      data_quality: {
        complete_records: 0,
        date_accuracy: 0,
        company_matching: 0,
        status_updates: 0
      }
    },
    loading: true,
    error: null
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedChart, setSelectedChart] = useState('area');
  const [exportLoading, setExportLoading] = useState(false);
  const [badgesData, setBadgesData] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchBadgesData();
  }, []);

  const fetchDashboardData = async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await axios.get('http://localhost:5454/api/stats', { withCredentials: true });
      console.log('Stats API Response:', response.data);
      
      if (response.data.success) {
        setData({
          stats: response.data.stats || {
            permanent_by_month: [],
            temporary_by_month: [],
            recovered_by_month: [],
            permanent_by_year: [],
            temporary_by_year: [],
            recovered_by_year: []
          },
          summary: response.data.summary || {
            total_all: 0,
            total_permanent: 0,
            total_temporary: 0,
            total_recovered: 0,
            valid_badges: 0,
            expired_badges: 0,
            processing_badges: 0,
            delayed_badges: 0,
            expiring_soon: 0,
            companies: 0,
            avg_processing_time: 0,
            data_quality: {
              complete_records: 0,
              date_accuracy: 0,
              company_matching: 0,
              status_updates: 0
            }
          },
          loading: false,
          error: null
        });
      } else {
        throw new Error(response.data.message || 'Échec de récupération des statistiques');
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setData(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.response?.data?.message || error.message || 'Échec de chargement du tableau de bord. Veuillez réessayer.' 
      }));
    }
  };

  const fetchBadgesData = async () => {
    try {
      const response = await axios.get('http://localhost:5454/api/badges', { withCredentials: true });
      if (response.data.success) {
        setBadgesData(response.data.badges || []);
      }
    } catch (error) {
      console.error('Failed to fetch badges data:', error);
    }
  };

  // Prepare chart data
  const chartData = useMemo(() => {
    console.log('Preparing chart data with period:', selectedPeriod);
    console.log('Raw stats data:', data.stats);
    
    if (data.loading || !data.stats) {
      console.log('Data still loading or stats unavailable');
      return [];
    }

    const isMonthly = selectedPeriod === 'month';
    const permanentData = isMonthly ? data.stats.permanent_by_month : data.stats.permanent_by_year;
    const temporaryData = isMonthly ? data.stats.temporary_by_month : data.stats.temporary_by_year;
    const recoveredData = isMonthly ? data.stats.recovered_by_month : data.stats.recovered_by_year;

    if (!Array.isArray(permanentData) || !Array.isArray(temporaryData) || !Array.isArray(recoveredData)) {
      console.warn('Invalid data arrays');
      return [];
    }

    // Get all unique periods
    const allPeriods = new Set();
    permanentData.forEach(item => item._id && allPeriods.add(item._id));
    temporaryData.forEach(item => item._id && allPeriods.add(item._id));
    recoveredData.forEach(item => item._id && allPeriods.add(item._id));

    const sortedPeriods = Array.from(allPeriods).sort();

    if (sortedPeriods.length === 0) {
      console.warn('No valid periods found');
      return [];
    }

    const preparedData = sortedPeriods.map(period => {
      const permanentItem = permanentData.find(item => item._id === period);
      const temporaryItem = temporaryData.find(item => item._id === period);
      const recoveredItem = recoveredData.find(item => item._id === period);

      const permanent = Number(permanentItem?.count || 0);
      const temporary = Number(temporaryItem?.count || 0);
      const recovered = Number(recoveredItem?.count || 0);

      return {
        period,
        permanent,
        temporary,
        recovered,
        total: permanent + temporary + recovered,
      };
    });

    console.log('Final prepared chart data:', preparedData);
    return preparedData;
  }, [data, selectedPeriod]);

  const exportToExcel = async (dataType) => {
    setExportLoading(true);
    try {
      let csvContent = '';
      let filename = '';
      
      switch(dataType) {
        case 'all':
          csvContent = generateAllDataCSV();
          filename = 'tous_les_badges.csv';
          break;
        case 'valid':
          csvContent = generateValidDataCSV();
          filename = 'badges_valides.csv';
          break;
        case 'expired':
          csvContent = generateExpiredDataCSV();
          filename = 'badges_expires.csv';
          break;
        case 'processing':
          csvContent = generateProcessingDataCSV();
          filename = 'badges_en_traitement.csv';
          break;
        case 'delayed':
          csvContent = generateDelayedDataCSV();
          filename = 'badges_retardes.csv';
          break;
        case 'recovered':
          csvContent = generateRecoveredDataCSV();
          filename = 'badges_recuperes.csv';
          break;
        case 'statistics':
          csvContent = generateStatisticsCSV(chartData);
          filename = 'statistiques_badges.csv';
          break;
        case 'companies':
          csvContent = generateCompaniesCSV();
          filename = 'rapport_entreprises.csv';
          break;
        case 'monthly_report':
          csvContent = generateMonthlyReportCSV();
          filename = 'rapport_mensuel.csv';
          break;
        default:
          return;
      }
      
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const generateAllDataCSV = () => {
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Type,Date Demande,Durée Validité,Statut\n';
    badgesData.forEach(badge => {
      const requestDate = badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A';
      const validityDuration = badge.validityDuration || 'N/A';
      csv += `"${badge.badgeNumber || 'N/A'}","${badge.fullName || 'N/A'}","${badge.company || 'N/A'}","${badge.badgeType || 'N/A'}","${requestDate}","${validityDuration}","${badge.status || 'N/A'}"\n`;
    });
    return csv;
  };

  const generateValidDataCSV = () => {
    const validBadges = badgesData.filter(badge => badge.status === 'active' || badge.status === 'valid');
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Type,Date Demande,Statut\n';
    validBadges.forEach(badge => {
      const requestDate = badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A';
      csv += `"${badge.badgeNumber || 'N/A'}","${badge.fullName || 'N/A'}","${badge.company || 'N/A'}","${badge.badgeType || 'N/A'}","${requestDate}","Valide"\n`;
    });
    return csv;
  };

  const generateExpiredDataCSV = () => {
    const expiredBadges = badgesData.filter(badge => badge.status === 'expired');
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Type,Date Expiration,Statut\n';
    expiredBadges.forEach(badge => {
      const requestDate = badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A';
      csv += `"${badge.badgeNumber || 'N/A'}","${badge.fullName || 'N/A'}","${badge.company || 'N/A'}","${badge.badgeType || 'N/A'}","${requestDate}","Expiré"\n`;
    });
    return csv;
  };

  const generateProcessingDataCSV = () => {
    const processingBadges = badgesData.filter(badge => badge.status === 'processing' || badge.status === 'unknown');
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Type,Date Demande,Jours de Traitement,Statut\n';
    processingBadges.forEach(badge => {
      const requestDate = badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A';
      const days = badge.requestDate ? Math.floor((new Date() - new Date(badge.requestDate)) / (1000 * 60 * 60 * 24)) : 'N/A';
      csv += `"${badge.badgeNumber || 'N/A'}","${badge.fullName || 'N/A'}","${badge.company || 'N/A'}","${badge.badgeType || 'N/A'}","${requestDate}","${days}","En traitement"\n`;
    });
    return csv;
  };

  const generateDelayedDataCSV = () => {
    const delayedBadges = badgesData.filter(badge => {
      if (!badge.requestDate) return false;
      const daysSinceRequest = Math.floor((new Date() - new Date(badge.requestDate)) / (1000 * 60 * 60 * 24));
      return daysSinceRequest >= 6 && (badge.status === 'processing' || badge.status === 'unknown');
    });
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Type,Date Demande,Jours de Retard,Priorité\n';
    delayedBadges.forEach(badge => {
      const requestDate = new Date(badge.requestDate).toLocaleDateString('fr-FR');
      const days = Math.floor((new Date() - new Date(badge.requestDate)) / (1000 * 60 * 60 * 24));
      const priority = days >= 10 ? 'URGENT' : days >= 8 ? 'Élevée' : 'Moyenne';
      csv += `"${badge.badgeNumber}","${badge.fullName}","${badge.company}","${badge.badgeType}","${requestDate}","${days}","${priority}"\n`;
    });
    return csv;
  };

  const generateRecoveredDataCSV = () => {
    const recoveredBadges = badgesData.filter(badge => badge.badgeType === 'recovered');
    let csv = 'Numéro Badge,Nom Complet,Entreprise,Date Récupération,Type Récupération,Type Badge\n';
    recoveredBadges.forEach(badge => {
      const recoveryDate = badge.requestDate ? new Date(badge.requestDate).toLocaleDateString('fr-FR') : 'N/A';
      const recoveryType = badge.validityDuration === 'décharge' ? 'Décharge' : 
                          badge.validityDuration?.includes('renouvellement') ? badge.validityDuration : 
                          badge.validityDuration || 'N/A';
      csv += `"${badge.badgeNumber || 'N/A'}","${badge.fullName || 'N/A'}","${badge.company || 'N/A'}","${recoveryDate}","${recoveryType}","${badge.badge_type || 'N/A'}"\n`;
    });
    return csv;
  };

  const generateCompaniesCSV = () => {
    const companyStats = {};
    badgesData.forEach(badge => {
      const company = badge.company || 'Entreprise inconnue';
      if (!companyStats[company]) {
        companyStats[company] = { total: 0, permanent: 0, temporary: 0, recovered: 0, valid: 0, expired: 0 };
      }
      companyStats[company].total++;
      companyStats[company][badge.badgeType]++;
      if (badge.status === 'active' || badge.status === 'valid') companyStats[company].valid++;
      if (badge.status === 'expired') companyStats[company].expired++;
    });

    let csv = 'Entreprise,Total Badges,Permanents,Temporaires,Récupérés,Valides,Expirés\n';
    Object.entries(companyStats).forEach(([company, stats]) => {
      csv += `"${company}","${stats.total}","${stats.permanent}","${stats.temporary}","${stats.recovered}","${stats.valid}","${stats.expired}"\n`;
    });
    return csv;
  };

  const generateMonthlyReportCSV = () => {
    const now = new Date();
    const currentMonth = now.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' });
    
    let csv = `Rapport Mensuel - ${currentMonth}\n\n`;
    csv += 'Résumé des Statistiques\n';
    csv += 'Métrique,Valeur\n';
    csv += `"Total des badges","${data.summary.total_all}"\n`;
    csv += `"Badges valides","${data.summary.valid_badges}"\n`;
    csv += `"Badges expirés","${data.summary.expired_badges}"\n`;
    csv += `"En traitement","${data.summary.processing_badges}"\n`;
    csv += `"Retardés","${data.summary.delayed_badges}"\n`;
    csv += `"Expirant bientôt","${data.summary.expiring_soon}"\n`;
    csv += `"Entreprises servies","${data.summary.companies}"\n`;
    csv += `"Temps moyen traitement","${data.summary.avg_processing_time} jours"\n`;
    csv += '\n';
    csv += 'Répartition par Type\n';
    csv += 'Type,Nombre\n';
    csv += `"Permanents","${data.summary.total_permanent}"\n`;
    csv += `"Temporaires","${data.summary.total_temporary}"\n`;
    csv += `"Récupérés","${data.summary.total_recovered}"\n`;
    return csv;
  };

  const generateStatisticsCSV = (chartData) => {
    let csv = 'Période,Permanents,Temporaires,Récupérés,Total\n';
    chartData.forEach(item => {
      csv += `"${item.period}","${item.permanent || 0}","${item.temporary || 0}","${item.recovered || 0}","${item.total || 0}"\n`;
    });
    return csv;
  };

  const statusData = [
    { name: 'Permanents', value: data.summary.total_permanent, color: '#3b82f6' },
    { name: 'Temporaires', value: data.summary.total_temporary, color: '#eab308' },
    { name: 'Récupérés', value: data.summary.total_recovered, color: '#22c55e' }
  ];

  const statusDistribution = [
    { name: 'Valides', value: data.summary.valid_badges, color: '#22c55e' },
    { name: 'Expirés', value: data.summary.expired_badges, color: '#ef4444' },
    { name: 'En traitement', value: data.summary.processing_badges, color: '#3b82f6' },
    { name: 'Retardés', value: data.summary.delayed_badges, color: '#f59e0b' }
  ];

  if (data.loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 rounded-md text-center">
        <p>{data.error}</p>
        <button 
          onClick={fetchDashboardData} 
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord</h1>
        <button 
          onClick={fetchDashboardData} 
          disabled={data.loading}
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          <RotateCw size={18} className={data.loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Cartes de Résumé - Statuts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard 
          title="Tous" 
          value={data.summary.total_all} 
          icon={<FileText className="text-gray-600" size={24} />} 
          color="gray" 
        />
        <StatCard 
          title="Valides" 
          value={data.summary.valid_badges} 
          icon={<CheckCircle className="text-green-600" size={24} />} 
          color="green" 
        />
        <StatCard 
          title="Expirés" 
          value={data.summary.expired_badges} 
          icon={<XCircle className="text-red-600" size={24} />} 
          color="red" 
        />
        <StatCard 
          title="En cours de traitement" 
          value={data.summary.processing_badges} 
          icon={<PlayCircle className="text-blue-600" size={24} />} 
          color="blue" 
        />
        <StatCard 
          title="Retardés" 
          value={data.summary.delayed_badges} 
          icon={<Timer className="text-orange-600" size={24} />} 
          color="orange" 
        />
      </div>

      {/* Cartes de Types */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard 
          title="Badges Permanents" 
          value={data.summary.total_permanent} 
          icon={<Shield className="text-blue-600" size={24} />} 
          color="blue" 
        />
        <StatCard 
          title="Badges Temporaires" 
          value={data.summary.total_temporary} 
          icon={<Clock className="text-yellow-600" size={24} />} 
          color="yellow" 
        />
        <StatCard 
          title="Badges Récupérés" 
          value={data.summary.total_recovered} 
          icon={<RotateCw className="text-green-600" size={24} />} 
          color="green" 
        />
        <StatCard 
          title="Entreprises Servies" 
          value={data.summary.companies} 
          icon={<Building className="text-purple-600" size={24} />} 
          color="purple" 
        />
      </div>

      {/* Section Graphiques */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <TrendingUp className="mr-2 text-green-600" size={20} />
          Tendances des Badges
        </h2>
        <div className="flex space-x-4 mb-4">
          <button 
            onClick={() => setSelectedPeriod('month')} 
            className={`px-4 py-2 rounded-md transition-colors ${selectedPeriod === 'month' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Mensuel
          </button>
          <button 
            onClick={() => setSelectedPeriod('year')} 
            className={`px-4 py-2 rounded-md transition-colors ${selectedPeriod === 'year' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Annuel
          </button>
        </div>
        <div className="flex space-x-4 mb-4">
          <button 
            onClick={() => setSelectedChart('area')} 
            className={`px-4 py-2 rounded-md transition-colors ${selectedChart === 'area' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Graphique en Aires
          </button>
          <button 
            onClick={() => setSelectedChart('line')} 
            className={`px-4 py-2 rounded-md transition-colors ${selectedChart === 'line' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Graphique Linéaire
          </button>
          <button 
            onClick={() => setSelectedChart('bar')} 
            className={`px-4 py-2 rounded-md transition-colors ${selectedChart === 'bar' ? 'bg-indigo-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            Graphique en Barres
          </button>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            {selectedChart === 'area' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#4b5563" />
                <YAxis stroke="#4b5563" />
                <Tooltip 
                  formatter={(value, name) => {
                    const displayName = name === 'permanent' ? 'Permanents' : 
                                       name === 'temporary' ? 'Temporaires' : 
                                       'Récupérés';
                    return [value, displayName];
                  }}
                  labelFormatter={(label) => `Période: ${label}`}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="permanent" 
                  stackId="1" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.8}
                  name="Permanents" 
                />
                <Area 
                  type="monotone" 
                  dataKey="temporary" 
                  stackId="1" 
                  stroke="#eab308" 
                  fill="#eab308" 
                  fillOpacity={0.8}
                  name="Temporaires" 
                />
                <Area 
                  type="monotone" 
                  dataKey="recovered" 
                  stackId="1" 
                  stroke="#22c55e" 
                  fill="#22c55e" 
                  fillOpacity={0.8}
                  name="Récupérés" 
                />
              </AreaChart>
            ) : selectedChart === 'line' ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#4b5563" />
                <YAxis stroke="#4b5563" />
                <Tooltip formatter={(value, name) => [value, name === 'permanent' ? 'Permanents' : name === 'temporary' ? 'Temporaires' : 'Récupérés']} />
                <Legend />
                <Line type="monotone" dataKey="permanent" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Permanents" />
                <Line type="monotone" dataKey="temporary" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} name="Temporaires" />
                <Line type="monotone" dataKey="recovered" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Récupérés" />
              </LineChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="period" stroke="#4b5563" />
                <YAxis stroke="#4b5563" />
                <Tooltip formatter={(value, name) => [value, name === 'permanent' ? 'Permanents' : name === 'temporary' ? 'Temporaires' : 'Récupérés']} />
                <Legend />
                <Bar dataKey="permanent" fill="#3b82f6" name="Permanents" />
                <Bar dataKey="temporary" fill="#eab308" name="Temporaires" />
                <Bar dataKey="recovered" fill="#22c55e" name="Récupérés" />
              </BarChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <TrendingUp size={48} className="mx-auto mb-4 text-gray-300" />
            <p>Aucune donnée de graphique disponible</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="mr-2 text-blue-600" size={20} />
            Répartition par Type
          </h2>
          {statusData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData.filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Aucune donnée de répartition disponible</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <BarChart2 className="mr-2 text-purple-600" size={20} />
            Distribution par Statut
          </h2>
          {statusDistribution.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution.filter(item => item.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, name]} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart2 size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Aucune donnée de statut disponible</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <TrendingUp className="mr-2 text-green-600" size={20} />
            Tendances Récentes
          </h2>
          <div className="space-y-3">
            <MetricItem 
              label="Croissance badges permanents" 
              value={`+${Math.round((data.summary.total_permanent / Math.max(data.summary.total_all, 1)) * 100)}%`}
              color="green" 
            />
            <MetricItem 
              label="Taux de traitement" 
              value={`${Math.round(((data.summary.total_all - data.summary.processing_badges) / Math.max(data.summary.total_all, 1)) * 100)}%`}
              color="blue" 
            />
            <MetricItem 
              label="Efficacité récupération" 
              value={`${Math.round((data.summary.total_recovered / Math.max(data.summary.total_all, 1)) * 100)}%`}
              color="purple" 
            />
            <MetricItem 
              label="Badges expirés" 
              value={`${Math.round((data.summary.expired_badges / Math.max(data.summary.total_all, 1)) * 100)}%`}
              color="red" 
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="mr-2 text-blue-600" size={20} />
            Métriques de Qualité des Données
          </h2>
          <div className="space-y-3">
            <DataQualityItem 
              label="Enregistrements complets" 
              percentage={data.summary.data_quality?.complete_records || 0} 
              status={getQualityStatus(data.summary.data_quality?.complete_records || 0)} 
            />
            <DataQualityItem 
              label="Précision des dates" 
              percentage={data.summary.data_quality?.date_accuracy || 0} 
              status={getQualityStatus(data.summary.data_quality?.date_accuracy || 0)} 
            />
            <DataQualityItem 
              label="Correspondance entreprises" 
              percentage={data.summary.data_quality?.company_matching || 0} 
              status={getQualityStatus(data.summary.data_quality?.company_matching || 0)} 
            />
            <DataQualityItem 
              label="Mises à jour statut" 
              percentage={data.summary.data_quality?.status_updates || 0} 
              status={getQualityStatus(data.summary.data_quality?.status_updates || 0)} 
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Calendar className="mr-2 text-purple-600" size={20} />
          Vue d'Ensemble des Données
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickStat label="Total des badges" value={data.summary.total_all} />
          <QuickStat label="Temps moyen traitement" value={`${data.summary.avg_processing_time} jours`} />
          <QuickStat label="Badges expirant bientôt" value={data.summary.expiring_soon} />
          <QuickStat label="Taux de réussite" value={`${Math.round(((data.summary.valid_badges + data.summary.total_recovered) / Math.max(data.summary.total_all, 1)) * 100)}%`} />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Download className="mr-2 text-indigo-600" size={20} />
          Rapports d'Exportation
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ExportButton 
            label="Tous les badges" 
            description="Base de données complète" 
            onClick={() => exportToExcel('all')} 
            loading={exportLoading} 
            icon={<FileText className="text-blue-600" size={20} />} 
          />
          <ExportButton 
            label="Badges valides" 
            description="Badges actifs uniquement" 
            onClick={() => exportToExcel('valid')} 
            loading={exportLoading} 
            icon={<CheckCircle className="text-green-600" size={20} />} 
          />
          <ExportButton 
            label="Badges expirés" 
            description="Badges expirés" 
            onClick={() => exportToExcel('expired')} 
            loading={exportLoading} 
            icon={<XCircle className="text-red-600" size={20} />} 
          />
          <ExportButton 
            label="En traitement" 
            description="Badges en cours" 
            onClick={() => exportToExcel('processing')} 
            loading={exportLoading} 
            icon={<PlayCircle className="text-blue-600" size={20} />} 
          />
          <ExportButton 
            label="Retardés" 
            description="Badges en retard" 
            onClick={() => exportToExcel('delayed')} 
            loading={exportLoading} 
            icon={<Timer className="text-orange-600" size={20} />} 
          />
          <ExportButton 
            label="Badges récupérés" 
            description="Récupérations et renouvellements" 
            onClick={() => exportToExcel('recovered')} 
            loading={exportLoading} 
            icon={<RotateCw className="text-green-600" size={20} />} 
          />
          <ExportButton 
            label="Statistiques" 
            description="Résumé des tendances" 
            onClick={() => exportToExcel('statistics')} 
            loading={exportLoading} 
            icon={<BarChart2 className="text-purple-600" size={20} />} 
          />
          <ExportButton 
            label="Rapport entreprises" 
            description="Statistiques par entreprise" 
            onClick={() => exportToExcel('companies')} 
            loading={exportLoading} 
            icon={<Building className="text-indigo-600" size={20} />} 
          />
          <ExportButton 
            label="Rapport mensuel" 
            description="Rapport complet du mois" 
            onClick={() => exportToExcel('monthly_report')} 
            loading={exportLoading} 
            icon={<Calendar className="text-purple-600" size={20} />} 
          />
        </div>
      </div>
    </div>
  );
}

// Fonctions utilitaires
const getQualityStatus = (percentage) => {
  if (percentage >= 95) return 'Excellent';
  if (percentage >= 85) return 'Bon';
  if (percentage >= 70) return 'Acceptable';
  return 'À améliorer';
};

// Composants Helper
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800'
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-4 transform transition-transform hover:scale-105`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value || 0}</p>
        </div>
        <div className="flex-shrink-0 ml-4">
          {icon}
        </div>
      </div>
    </div>
  );
};

const ExportButton = ({ label, description, onClick, loading, icon }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 text-left transform transition-transform hover:scale-105"
  >
    <div className="flex items-center mb-2">
      {icon}
      <span className="font-medium ml-2 text-gray-800">{label}</span>
    </div>
    <p className="text-sm text-gray-600">{description}</p>
    {loading && (
      <div className="mt-2 flex items-center text-sm text-blue-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
        Exportation...
      </div>
    )}
  </button>
);

const MetricItem = ({ label, value, color }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
    purple: 'text-purple-600'
  };

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`font-semibold ${colorClasses[color]}`}>{value}</span>
    </div>
  );
};

const QuickStat = ({ label, value }) => (
  <div className="text-center p-4 bg-gray-50 rounded-lg">
    <p className="text-sm text-gray-600 mb-1">{label}</p>
    <p className="text-xl font-bold text-gray-800">{value || 0}</p>
  </div>
);

const DataQualityItem = ({ label, percentage, status }) => {
  const getStatusColor = (status) => {
    switch(status) {
      case 'Excellent': return 'text-green-800 bg-green-100';
      case 'Bon': return 'text-blue-800 bg-blue-100';
      case 'Acceptable': return 'text-yellow-800 bg-yellow-100';
      case 'À améliorer': return 'text-red-800 bg-red-100';
      default: return 'text-gray-800 bg-gray-100';
    }
  };

  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center space-x-2">
        <span className="font-medium text-gray-800">{percentage}%</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
          {status}
        </span>
      </div>
    </div>
  );
};