import React from 'react';

// A simple dashboard component to display file history and analytics.
// This is a placeholder and can be expanded with more features.
const Dashboard = ({ files }) => {
  return (
    <div className="w-full p-8 bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white mb-6">My Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Total Files</h3>
          <p className="text-3xl font-bold text-cyan-400">{files.length}</p>
        </div>
        <div className="bg-gray-700 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-white">Storage Used</h3>
          <p className="text-3xl font-bold text-cyan-400">N/A</p> {/* Placeholder */}
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <ul className="space-y-4">
          {files.slice(0, 5).map((file, index) => (
            <li key={index} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
              <span className="text-white">{file.name}</span>
              <span className="text-gray-400 text-sm">
                {new Date(file.uploadTime).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
