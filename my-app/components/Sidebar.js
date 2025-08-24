// File Location: my-app/components/Sidebar.js
import React from 'react';

// Simple SVG icons for demonstration
const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>;
const VaultIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

const Sidebar = () => {
  return (
    <aside className="w-20 bg-space-indigo/50 backdrop-blur-lg border-r border-white/10 p-4 flex flex-col items-center justify-between">
      <div>
        <div className="w-10 h-10 mb-10 bg-electric-cyan/20 rounded-lg flex items-center justify-center text-electric-cyan font-bold text-xl">
          DV
        </div>
        <nav className="flex flex-col items-center space-y-6">
          <a href="#" className="text-white/50 hover:text-white transition-colors p-2 rounded-lg bg-white/10">
            <DashboardIcon />
          </a>
          <a href="#" className="text-white/50 hover:text-white transition-colors p-2 rounded-lg">
            <VaultIcon />
          </a>
          <a href="#" className="text-white/50 hover:text-white transition-colors p-2 rounded-lg">
            <SettingsIcon />
          </a>
        </nav>
      </div>
      <div className="w-full">
        <div className="text-center text-xs text-white/50 mb-2">Storage</div>
        <div className="w-full bg-white/10 h-2 rounded-full">
          <div className="bg-electric-cyan h-full rounded-full" style={{ width: '30%' }}></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
