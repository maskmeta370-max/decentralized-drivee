"use client";
import { useState, useEffect } from 'react';
import { 
  ChartBarIcon,
  CloudIcon,
  ShareIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  GlobeAltIcon,
  ServerIcon,
  DocumentIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const AnalyticsDashboard = ({ files = [], stats = {} }) => {
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, 1y
  const [analyticsData, setAnalyticsData] = useState({
    storageUsage: {
      used: 2.4,
      total: 10,
      unit: 'GB'
    },
    networkStats: {
      uploadSpeed: 1.2,
      downloadSpeed: 3.4,
      peers: 156,
      uptime: 99.2
    },
    fileStats: {
      totalFiles: 24,
      sharedFiles: 8,
      privateFiles: 16,
      totalDownloads: 142
    },
    monthlyData: [
      { month: 'Jan', uploads: 12, downloads: 45, storage: 1.2 },
      { month: 'Feb', uploads: 19, downloads: 52, storage: 1.8 },
      { month: 'Mar', uploads: 8, downloads: 38, storage: 2.1 },
      { month: 'Apr', uploads: 15, downloads: 67, storage: 2.4 },
      { month: 'May', uploads: 22, downloads: 89, storage: 3.1 },
      { month: 'Jun', uploads: 18, downloads: 76, storage: 2.9 }
    ]
  });

  const timeRanges = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' }
  ];

  const StatCard = ({ title, value, unit, icon: Icon, trend, trendValue, color = 'blue' }) => {
    const colorClasses = {
      blue: 'bg-blue-50 border-blue-200 text-blue-600',
      green: 'bg-green-50 border-green-200 text-green-600',
      purple: 'bg-purple-50 border-purple-200 text-purple-600',
      orange: 'bg-orange-50 border-orange-200 text-orange-600'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          {trend && (
            <div className={`flex items-center space-x-1 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span>{trendValue}%</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-2xl font-bold text-gray-900">
            {value}
            {unit && <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>}
          </h3>
          <p className="text-gray-600 text-sm mt-1">{title}</p>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, max, unit, color = 'blue' }) => {
    const percentage = (value / max) * 100;
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500'
    };

    return (
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 font-medium">{label}</span>
          <span className="text-gray-500">
            {value} / {max} {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${colorClasses[color]}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500">
          {percentage.toFixed(1)}% used
        </div>
      </div>
    );
  };

  const SimpleChart = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => Math.max(d.uploads, d.downloads, d.storage * 10)));
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700">{item.month}</span>
                <div className="flex space-x-4 text-xs text-gray-500">
                  <span>↑ {item.uploads}</span>
                  <span>↓ {item.downloads}</span>
                  <span>📁 {item.storage}GB</span>
                </div>
              </div>
              <div className="flex space-x-1 h-2">
                <div 
                  className="bg-blue-500 rounded-sm"
                  style={{ width: `${(item.uploads / maxValue) * 100}%` }}
                />
                <div 
                  className="bg-green-500 rounded-sm"
                  style={{ width: `${(item.downloads / maxValue) * 100}%` }}
                />
                <div 
                  className="bg-purple-500 rounded-sm"
                  style={{ width: `${(item.storage * 10 / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-gray-600">Uploads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-gray-600">Downloads</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-500 rounded-sm" />
            <span className="text-gray-600">Storage (×10)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">Monitor your storage usage and network participation</p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Files"
          value={analyticsData.fileStats.totalFiles}
          icon={DocumentIcon}
          trend="up"
          trendValue={12}
          color="blue"
        />
        <StatCard
          title="Storage Used"
          value={analyticsData.storageUsage.used}
          unit={analyticsData.storageUsage.unit}
          icon={CloudIcon}
          trend="up"
          trendValue={8}
          color="green"
        />
        <StatCard
          title="Network Peers"
          value={analyticsData.networkStats.peers}
          icon={GlobeAltIcon}
          trend="up"
          trendValue={5}
          color="purple"
        />
        <StatCard
          title="Total Downloads"
          value={analyticsData.fileStats.totalDownloads}
          icon={ShareIcon}
          trend="up"
          trendValue={23}
          color="orange"
        />
      </div>

      {/* Storage and Network Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Storage Usage */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Storage Usage</h3>
          <div className="space-y-4">
            <ProgressBar
              label="Total Storage"
              value={analyticsData.storageUsage.used}
              max={analyticsData.storageUsage.total}
              unit="GB"
              color="blue"
            />
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analyticsData.fileStats.privateFiles}</div>
                <div className="text-sm text-gray-600">Private Files</div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">{analyticsData.fileStats.sharedFiles}</div>
                <div className="text-sm text-gray-600">Shared Files</div>
              </div>
            </div>
          </div>
        </div>

        {/* Network Performance */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Network Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingUpIcon className="w-5 h-5 text-green-600" />
                <span className="text-gray-700">Upload Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.uploadSpeed} MB/s</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ArrowTrendingDownIcon className="w-5 h-5 text-blue-600" />
                <span className="text-gray-700">Download Speed</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.downloadSpeed} MB/s</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <ServerIcon className="w-5 h-5 text-purple-600" />
                <span className="text-gray-700">Uptime</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.uptime}%</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <UsersIcon className="w-5 h-5 text-orange-600" />
                <span className="text-gray-700">Connected Peers</span>
              </div>
              <span className="font-semibold text-gray-900">{analyticsData.networkStats.peers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Chart */}
      <SimpleChart 
        data={analyticsData.monthlyData}
        title="Monthly Activity Overview"
      />

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { action: 'File uploaded', file: 'project-proposal.pdf', time: '2 hours ago', type: 'upload' },
            { action: 'File shared', file: 'team-photo.jpg', time: '4 hours ago', type: 'share' },
            { action: 'File downloaded', file: 'smart-contract.sol', time: '6 hours ago', type: 'download' },
            { action: 'File uploaded', file: 'presentation.pptx', time: '1 day ago', type: 'upload' },
            { action: 'File shared', file: 'whitepaper.pdf', time: '2 days ago', type: 'share' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'upload' ? 'bg-green-500' :
                  activity.type === 'share' ? 'bg-blue-500' : 'bg-purple-500'
                }`} />
                <div>
                  <div className="text-sm font-medium text-gray-900">{activity.action}</div>
                  <div className="text-xs text-gray-500">{activity.file}</div>
                </div>
              </div>
              <div className="text-xs text-gray-500">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;