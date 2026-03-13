import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

function normalize(value, max) {
  return Math.min(Math.round((value / max) * 100), 100);
}

export default function ExposomeRadar({ weather = {}, pollutants = {}, aqi = 2, uvIndex = 0 }) {
  const data = [
    {
      metric: 'AQI',
      value: normalize(aqi, 5),
      fullMark: 100,
    },
    {
      metric: 'UV Index',
      value: normalize(uvIndex, 11),
      fullMark: 100,
    },
    {
      metric: 'PM2.5',
      value: normalize(pollutants.pm25 || 0, 75),
      fullMark: 100,
    },
    {
      metric: 'PM10',
      value: normalize(pollutants.pm10 || 0, 150),
      fullMark: 100,
    },
    {
      metric: 'Temp',
      value: normalize(Math.abs(weather.temp || 25), 50),
      fullMark: 100,
    },
    {
      metric: 'Humidity',
      value: weather.humidity || 50,
      fullMark: 100,
    },
    {
      metric: 'O₃',
      value: normalize(pollutants.o3 || 0, 200),
      fullMark: 100,
    },
    {
      metric: 'NO₂',
      value: normalize(pollutants.no2 || 0, 200),
      fullMark: 100,
    },
  ];

  // Dynamic color based on overall risk
  const avgValue = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  let strokeColor = '#66bb6a';
  let fillColor = 'rgba(102, 187, 106, 0.2)';
  if (avgValue > 60) {
    strokeColor = '#ef5350';
    fillColor = 'rgba(239, 83, 80, 0.2)';
  } else if (avgValue > 40) {
    strokeColor = '#ffa726';
    fillColor = 'rgba(255, 167, 38, 0.2)';
  } else if (avgValue > 25) {
    strokeColor = '#4fc3f7';
    fillColor = 'rgba(79, 195, 247, 0.2)';
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: 'rgba(20, 20, 35, 0.95)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem',
          fontSize: '0.8rem',
        }}>
          <p style={{ fontWeight: 600 }}>{payload[0].payload.metric}</p>
          <p style={{ color: strokeColor }}>{payload[0].value}% of threshold</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="expo-glass-card"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
        Environmental Risk Radar
      </h3>
      <p style={{ color: '#8888a0', fontSize: '0.8rem', marginBottom: '1rem' }}>
        Normalized pollutant and weather metrics — higher values = higher risk
      </p>
      <div className="radar-container">
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: '#8888a0', fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={90}
              tick={{ fill: '#555', fontSize: 9 }}
              domain={[0, 100]}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Risk Level"
              dataKey="value"
              stroke={strokeColor}
              fill={fillColor}
              strokeWidth={2}
              dot={{ r: 3, fill: strokeColor }}
              animationDuration={1500}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
