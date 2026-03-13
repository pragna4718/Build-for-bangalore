import { motion } from 'framer-motion';

export default function WeatherCard({ weather = {} }) {
  const {
    temp = '--',
    feelsLike = '--',
    humidity = '--',
    description = 'N/A',
    windSpeed = '--',
    pressure = '--',
    visibility = '--',
    clouds = '--',
    sunrise,
    sunset,
  } = weather;

  const getWeatherIcon = (desc = '') => {
    const d = desc.toLowerCase();
    if (d.includes('clear')) return '☀️';
    if (d.includes('few clouds') || d.includes('scattered')) return '🌤️';
    if (d.includes('cloud')) return '⛅';
    if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
    if (d.includes('thunder')) return '⛈️';
    if (d.includes('snow')) return '❄️';
    if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
    return '🌤️';
  };

  const formatTime = (unix) => {
    if (!unix) return '--:--';
    return new Date(unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const details = [
    { icon: '💧', label: 'Humidity', value: `${humidity}%` },
    { icon: '💨', label: 'Wind Speed', value: `${windSpeed} m/s` },
    { icon: '🌡️', label: 'Pressure', value: `${pressure} hPa` },
    { icon: '☁️', label: 'Cloud Cover', value: `${clouds}%` },
    { icon: '🌅', label: 'Sunrise', value: formatTime(sunrise) },
    { icon: '🌇', label: 'Sunset', value: formatTime(sunset) },
  ];

  return (
    <motion.div
      className="expo-glass-card weather-card"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="weather-card-main">
        <div>
          <div className="weather-temp">
            {temp}
            <span className="weather-temp-unit">°C</span>
          </div>
          <div className="weather-feels-like">
            Feels like {feelsLike}°C
          </div>
        </div>
        <div className="weather-icon-wrap">
          <span className="weather-icon">{getWeatherIcon(description)}</span>
          <span className="weather-desc">{description}</span>
        </div>
      </div>

      <div className="weather-details">
        {details.map((d, i) => (
          <motion.div
            key={d.label}
            className="weather-detail-item"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i, duration: 0.4 }}
          >
            <span className="weather-detail-icon">{d.icon}</span>
            <div className="weather-detail-info">
              <span className="weather-detail-value">{d.value}</span>
              <span className="weather-detail-label">{d.label}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
