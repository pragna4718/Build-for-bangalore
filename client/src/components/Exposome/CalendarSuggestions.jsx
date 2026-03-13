import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { motion, AnimatePresence } from 'framer-motion';
import 'swiper/css';
import 'swiper/css/pagination';

export default function CalendarSuggestions({ suggestions = [], onFetchSuggestions }) {
  const [schedule, setSchedule] = useState([
    { title: 'Breakfast', start: '08:00', end: '08:30' },
    { title: 'Morning Standup', start: '09:00', end: '09:30' },
    { title: 'Deep Work', start: '09:30', end: '12:00' },
    { title: 'Lunch', start: '12:00', end: '13:00' },
    { title: 'Meetings', start: '14:00', end: '16:00' },
    { title: 'Dinner', start: '19:00', end: '19:45' },
  ]);

  const [newEvent, setNewEvent] = useState({ title: '', start: '', end: '' });

  const addEvent = () => {
    if (newEvent.title && newEvent.start && newEvent.end) {
      const updated = [...schedule, newEvent].sort((a, b) =>
        a.start.localeCompare(b.start)
      );
      setSchedule(updated);
      setNewEvent({ title: '', start: '', end: '' });
      if (onFetchSuggestions) {
        onFetchSuggestions(updated);
      }
    }
  };

  const removeEvent = (index) => {
    const updated = schedule.filter((_, i) => i !== index);
    setSchedule(updated);
    if (onFetchSuggestions) {
      onFetchSuggestions(updated);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') addEvent();
  };

  return (
    <div className="calendar-section">
      {/* Schedule Input */}
      <div className="expo-glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          📅 Your Schedule
        </h3>
        <p style={{ color: '#8888a0', fontSize: '0.8rem', marginBottom: '1rem' }}>
          Add your daily events — we'll find healthy activity windows in your free time
        </p>

        <div className="calendar-add-bar">
          <input
            type="text"
            placeholder="Event name (e.g., Breakfast)"
            value={newEvent.title}
            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
            onKeyPress={handleKeyPress}
          />
          <input
            type="time"
            value={newEvent.start}
            onChange={(e) => setNewEvent({ ...newEvent, start: e.target.value })}
          />
          <input
            type="time"
            value={newEvent.end}
            onChange={(e) => setNewEvent({ ...newEvent, end: e.target.value })}
          />
          <button onClick={addEvent}>+ Add Event</button>
        </div>

        <div className="calendar-schedule">
          <AnimatePresence>
            {schedule.map((event, i) => (
              <motion.div
                key={`${event.title}-${event.start}`}
                className="calendar-event-tag"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <span style={{ color: '#4fc3f7' }}>{event.start}-{event.end}</span>
                <span>{event.title}</span>
                <button onClick={() => removeEvent(i)}>×</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button
          onClick={() => onFetchSuggestions && onFetchSuggestions(schedule)}
          style={{
            background: 'linear-gradient(135deg, #26c6da, #4fc3f7)',
            color: '#000',
            border: 'none',
            padding: '0.6rem 1.5rem',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginTop: '0.5rem',
          }}
        >
          🔍 Find Health Windows
        </button>
      </div>

      {/* Suggestions Carousel */}
      {suggestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Swiper
            modules={[Pagination, Autoplay]}
            spaceBetween={20}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{ delay: 5000, disableOnInteraction: true }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="suggestion-swiper"
          >
            {suggestions.map((suggestion, i) => (
              <SwiperSlide key={i}>
                <motion.div
                  className="suggestion-card"
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <span className="suggestion-card-icon">{suggestion.icon}</span>
                  <h4 className="suggestion-card-activity">{suggestion.activity}</h4>
                  <p className="suggestion-card-reason">{suggestion.reason}</p>
                  <div className="suggestion-card-footer">
                    <span className="suggestion-card-time">
                      🕐 {suggestion.timeSlot}
                    </span>
                    <span className="suggestion-card-duration">
                      {suggestion.duration}
                    </span>
                  </div>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      )}

      {suggestions.length === 0 && (
        <div className="expo-glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔎</p>
          <p style={{ color: '#8888a0', fontSize: '0.9rem' }}>
            Click "Find Health Windows" to get smart activity suggestions based on your schedule and current weather.
          </p>
        </div>
      )}
    </div>
  );
}
