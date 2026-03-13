import { motion } from 'framer-motion';

const POLLUTANT_INFO = {
  pm25: {
    name: 'PM2.5',
    unit: 'μg/m³',
    thresholds: { good: 12, moderate: 35, poor: 55 },
    effect: 'Fine particles that penetrate deep into lungs and bloodstream. Can cause respiratory disease, heart attacks, and premature death.',
    protection: 'Wear N95 mask, use HEPA air purifier, avoid outdoor exercise',
  },
  pm10: {
    name: 'PM10',
    unit: 'μg/m³',
    thresholds: { good: 20, moderate: 50, poor: 100 },
    effect: 'Coarse particles that irritate eyes, nose, and throat. Aggravates asthma and bronchitis.',
    protection: 'Stay indoors during high levels, keep windows closed',
  },
  co: {
    name: 'CO',
    unit: 'μg/m³',
    thresholds: { good: 4400, moderate: 9400, poor: 12400 },
    effect: 'Carbon monoxide reduces oxygen delivery to organs. Causes headaches, dizziness, and at high levels can be fatal.',
    protection: 'Ensure ventilation, avoid idling vehicles, use CO detectors',
  },
  no2: {
    name: 'NO₂',
    unit: 'μg/m³',
    thresholds: { good: 40, moderate: 100, poor: 200 },
    effect: 'Nitrogen dioxide inflames airways, worsens asthma, and increases susceptibility to respiratory infections.',
    protection: 'Avoid busy roads, keep car windows up in traffic',
  },
  o3: {
    name: 'O₃',
    unit: 'μg/m³',
    thresholds: { good: 60, moderate: 100, poor: 180 },
    effect: 'Ground-level ozone damages lung tissue, causes chest pain, coughing, and reduces lung function over time.',
    protection: 'Limit outdoor activity in afternoon, exercise indoors or early morning',
  },
};

function getLevel(value, thresholds) {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.moderate) return 'moderate';
  return 'poor';
}

function getBarPercent(value, thresholds) {
  const max = thresholds.poor * 1.5;
  return Math.min((value / max) * 100, 100);
}

function getBarColor(level) {
  if (level === 'good') return '#66bb6a';
  if (level === 'moderate') return '#ffa726';
  return '#ef5350';
}

function getAQIColor(aqi) {
  const colors = { 1: '#66bb6a', 2: '#4fc3f7', 3: '#ffa726', 4: '#ef5350', 5: '#d32f2f' };
  return colors[aqi] || '#4fc3f7';
}

function getAQIDescription(category) {
  const descriptions = {
    'Good': 'Air quality is satisfactory with minimal health risk.',
    'Fair': 'Air quality is acceptable. Sensitive individuals may feel slight effects.',
    'Moderate': 'May cause health effects for sensitive groups. General public less likely affected.',
    'Poor': 'Health effects possible for everyone. Sensitive groups will feel stronger effects.',
    'Very Poor': 'Emergency condition. The entire population is likely to be affected.',
  };
  return descriptions[category] || 'No data available.';
}

export default function AQIPanel({ aqi = 2, aqiCategory = 'Fair', pollutants = {} }) {
  const color = getAQIColor(aqi);

  return (
    <motion.div
      className="expo-glass-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
    >
      <div className="aqi-panel-header">
        <div className="aqi-gauge">
          <motion.div
            className="aqi-gauge-circle"
            style={{ borderColor: color }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
          >
            <span className="aqi-gauge-value" style={{ color }}>{aqi}</span>
            <span className="aqi-gauge-label">AQI</span>
          </motion.div>
          <div>
            <div className="aqi-gauge-category" style={{ color }}>{aqiCategory}</div>
            <div className="aqi-gauge-desc">{getAQIDescription(aqiCategory)}</div>
          </div>
        </div>
      </div>

      <div className="aqi-pollutants-grid">
        {Object.entries(POLLUTANT_INFO).map(([key, info], i) => {
          const value = pollutants[key] || 0;
          const level = getLevel(value, info.thresholds);
          const barPercent = getBarPercent(value, info.thresholds);
          const barColor = getBarColor(level);

          return (
            <motion.div
              key={key}
              className="aqi-pollutant-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 * i, duration: 0.4 }}
            >
              <div className="aqi-pollutant-header">
                <span className="aqi-pollutant-name">{info.name}</span>
                <span className={`aqi-pollutant-badge aqi-badge-${level}`}>
                  {level}
                </span>
              </div>
              <div className="aqi-pollutant-value" style={{ color: barColor }}>
                {typeof value === 'number' ? value.toFixed(1) : value}
                <span className="aqi-pollutant-unit"> {info.unit}</span>
              </div>
              <div className="aqi-pollutant-bar">
                <motion.div
                  className="aqi-pollutant-bar-fill"
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${barPercent}%` }}
                  transition={{ duration: 1, delay: 0.2 * i }}
                />
              </div>
              <div className="aqi-pollutant-effect">
                <strong>Health Impact:</strong> {info.effect}
              </div>
              <div className="aqi-pollutant-effect" style={{ marginTop: '0.5rem', color: '#4fc3f7' }}>
                <strong>Protection:</strong> {info.protection}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
