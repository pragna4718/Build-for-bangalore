import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmergencyContacts({ contacts = [], isEmergencyActive, onUpdateContacts }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relation: '' });

  const defaultContacts = contacts.length > 0 ? contacts : [
    { name: 'Emergency Services', phone: '112', relation: 'National Emergency' },
    { name: 'Ambulance', phone: '108', relation: 'Medical Emergency' },
  ];

  const handleAdd = () => {
    if (!newContact.name || !newContact.phone) return;
    const updated = [...(contacts || []), newContact];
    if (onUpdateContacts) onUpdateContacts(updated);
    setNewContact({ name: '', phone: '', relation: '' });
    setShowAdd(false);
  };

  const handleRemove = (index) => {
    const updated = contacts.filter((_, i) => i !== index);
    if (onUpdateContacts) onUpdateContacts(updated);
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <motion.div
      className="emer-glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
            📋 Emergency Contacts
          </h3>
          <p style={{ color: '#8888a0', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
            Auto-notified when emergency SOS is triggered
          </p>
        </div>
        {isEmergencyActive && (
          <span style={{
            fontSize: '0.7rem',
            padding: '0.3rem 0.75rem',
            background: 'rgba(239, 83, 80, 0.15)',
            color: '#ef5350',
            borderRadius: '12px',
            fontWeight: 700,
            animation: 'pulse-critical 1s ease-in-out infinite',
          }}>
            ● ALERTING
          </span>
        )}
      </div>

      {/* Emergency Services */}
      <a
        href="tel:112"
        className="emergency-call-btn"
        style={{ marginTop: 0, marginBottom: '1.25rem' }}
      >
        📞 Call Emergency Services — 112
      </a>

      {/* Contacts Grid */}
      <div className="contacts-grid">
        {defaultContacts.map((contact, i) => (
          <motion.div
            key={i}
            className={`contact-card ${isEmergencyActive ? 'notified' : ''}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="contact-avatar">
              {getInitials(contact.name)}
            </div>
            <div className="contact-info">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-relation">{contact.relation || 'Contact'}</div>
              <a href={`tel:${contact.phone}`} className="contact-phone">
                📱 {contact.phone}
              </a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
              {isEmergencyActive && (
                <span className="contact-status notified">✓ Notified</span>
              )}
              {contact.phone !== '112' && contact.phone !== '108' && (
                <button
                  onClick={() => handleRemove(i)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {/* Add Contact Button */}
        <button className="add-contact-btn" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </div>

      {/* Add Contact Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: '1rem' }}
          >
            <div style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              padding: '1rem',
              background: 'var(--emer-glass)',
              borderRadius: 'var(--emer-radius-sm)',
              border: '1px solid var(--emer-glass-border)',
            }}>
              <input
                placeholder="Name"
                value={newContact.name}
                onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                style={{
                  flex: '1 1 120px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--emer-glass-border)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <input
                placeholder="Phone"
                value={newContact.phone}
                onChange={(e) => setNewContact(prev => ({ ...prev, phone: e.target.value }))}
                style={{
                  flex: '1 1 120px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--emer-glass-border)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <input
                placeholder="Relation"
                value={newContact.relation}
                onChange={(e) => setNewContact(prev => ({ ...prev, relation: e.target.value }))}
                style={{
                  flex: '1 1 100px',
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--emer-glass-border)',
                  borderRadius: '8px',
                  color: '#e8e8f0',
                  padding: '0.6rem 0.75rem',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleAdd}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: 'linear-gradient(135deg, #4fc3f7, #26c6da)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
