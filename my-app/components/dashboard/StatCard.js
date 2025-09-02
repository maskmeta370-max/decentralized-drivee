'use client';

const StatCard = ({ title, value, icon, trend }) => {
  const isPositiveTrend = trend > 0;
  const trendColor = isPositiveTrend ? 'text-green-400' : 'text-red-400';
  const trendIcon = isPositiveTrend ? '↗️' : '↘️';

  return (
    <div className="bg-gradient-to-br from-space-indigo/80 to-purple-900/50 backdrop-blur-sm border border-electric-cyan/20 rounded-xl p-6 hover:border-electric-cyan/40 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-electric-cyan/20 rounded-lg flex items-center justify-center">
          <span className="text-2xl">{icon}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center space-x-1 ${trendColor}`}>
            <span className="text-sm">{trendIcon}</span>
            <span className="text-sm font-medium">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-light-silver/80 text-sm font-medium mb-2">{title}</h3>
        <p className="text-3xl font-bold text-light-silver">{value}</p>
      </div>

      {/* Trend Description */}
      {trend !== undefined && (
        <div className="mt-4 pt-4 border-t border-electric-cyan/10">
          <p className="text-light-silver/60 text-xs">
            {isPositiveTrend ? 'Increased' : 'Decreased'} by {Math.abs(trend)}% from last month
          </p>
        </div>
      )}
    </div>
  );
};

export default StatCard;