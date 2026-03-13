import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

export default function FirstAidGuide({ emergencyType, steps = [] }) {
  if (!steps || steps.length === 0) {
    return (
      <motion.div
        className="emer-glass-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', color: '#8888a0' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
          <h3 style={{ fontWeight: 700, color: '#66bb6a' }}>All Clear</h3>
          <p style={{ fontSize: '0.9rem' }}>
            No emergency detected. First-aid guidance will appear here if an emergency condition is identified.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="emer-glass-card danger"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '1.5rem' }}>🩺</span>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            First Aid — {emergencyType}
          </h3>
        </div>
        <p style={{ color: '#8888a0', fontSize: '0.8rem', marginLeft: '2.25rem' }}>
          Follow these steps while waiting for professional help. Swipe through each step.
        </p>
      </div>

      <Swiper
        modules={[Pagination, Navigation]}
        spaceBetween={16}
        slidesPerView={1}
        pagination={{ clickable: true }}
        navigation
        breakpoints={{
          640: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        className="firstaid-swiper"
      >
        {steps.map((step, i) => (
          <SwiperSlide key={i}>
            <motion.div
              className="firstaid-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="firstaid-step-number">Step {step.step} of {steps.length}</div>
              <div className="firstaid-card-icon">{step.icon}</div>
              <div className="firstaid-card-title">{step.title}</div>
              <div className="firstaid-card-desc">{step.desc}</div>
              <div className="firstaid-card-footer">
                {step.timer && (
                  <span className="firstaid-card-timer">⏱ {step.timer}</span>
                )}
                <span className="firstaid-card-tag">
                  {step.step <= 2 ? 'Immediate' : step.step <= 4 ? 'Follow-up' : 'Ongoing'}
                </span>
              </div>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </motion.div>
  );
}
