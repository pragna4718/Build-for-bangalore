import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function EmergencyHero({ severity = 'safe', heartRate = 72, spo2 = 98 }) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });

    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Color mapping based on severity
    const severityColors = {
      safe: new THREE.Color(0x66bb6a),
      warning: new THREE.Color(0xffa726),
      'pre-emergency': new THREE.Color(0xffa726),
      emergency: new THREE.Color(0xef5350),
      critical: new THREE.Color(0xd32f2f),
    };

    const particleColor = severityColors[severity] || severityColors.safe;
    const particleCount = 2500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    // Create heart-shaped particle distribution
    for (let i = 0; i < particleCount; i++) {
      const t = (i / particleCount) * Math.PI * 2;
      const spread = 0.5 + Math.random() * 1.5;
      
      // Heart parametric equation with randomization
      const x = (16 * Math.pow(Math.sin(t), 3)) * 0.15 * spread + (Math.random() - 0.5) * 2;
      const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.15 * spread + (Math.random() - 0.5) * 2;
      const z = (Math.random() - 0.5) * 3;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Velocity — faster in emergency
      const speed = severity === 'emergency' || severity === 'critical' ? 0.015 : 0.004;
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: particleColor,
      size: 0.06,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Inner glow heart wireframe
    const glowGeometry = new THREE.SphereGeometry(2.2, 24, 24);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.03,
      wireframe: true,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    // Outer ring
    const ringGeometry = new THREE.RingGeometry(3.8, 4.0, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    scene.add(ring);

    camera.position.z = 8;

    let time = 0;
    // Heartbeat speed based on HR
    const beatRate = Math.max(40, Math.min(heartRate, 200));
    const beatSpeed = beatRate / 60;

    const animate = () => {
      time += 0.01;
      animationRef.current = requestAnimationFrame(animate);

      particles.rotation.y += 0.0008;
      particles.rotation.x += 0.0003;
      glow.rotation.y -= 0.0015;
      ring.rotation.z += 0.001;

      // Heartbeat pulse — double bump
      const beat = Math.sin(time * beatSpeed * Math.PI * 2);
      const beat2 = Math.sin(time * beatSpeed * Math.PI * 2 + 0.3);
      const pulseScale = 1 + Math.max(0, beat) * 0.06 + Math.max(0, beat2) * 0.03;
      particles.scale.set(pulseScale, pulseScale, pulseScale);

      // Animate particle positions
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];

        const dist = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
        if (dist > 5 || dist < 0.5) {
          velocities[i * 3] *= -1;
          velocities[i * 3 + 1] *= -1;
          velocities[i * 3 + 2] *= -1;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      ringGeometry.dispose();
      ringMaterial.dispose();
    };
  }, [severity, heartRate]);

  const getSeverityLabel = () => {
    const labels = {
      safe: 'All Systems Normal',
      warning: 'Elevated Readings',
      'pre-emergency': '⚠️ Pre-Emergency Detected',
      emergency: '🚨 EMERGENCY ACTIVE',
      critical: '🚨 CRITICAL EMERGENCY',
    };
    return labels[severity] || labels.safe;
  };

  const getSeverityColor = () => {
    const colors = { safe: '#66bb6a', warning: '#ffa726', 'pre-emergency': '#ffa726', emergency: '#ef5350', critical: '#d32f2f' };
    return colors[severity] || '#66bb6a';
  };

  return (
    <div className="emer-hero">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="emer-hero-overlay">
        <h1 className="emer-hero-title">
          <span>Emergency</span> Life Saver
        </h1>
        <p className="emer-hero-subtitle">
          Wearable-driven emergency detection — real-time vital monitoring, instant alerts, and life-saving first-aid guidance.
        </p>
        <div className="emer-hero-stats">
          <div className="emer-hero-stat">
            <span className="emer-hero-stat-value" style={{ color: getSeverityColor() }}>
              {getSeverityLabel()}
            </span>
            <span className="emer-hero-stat-label">System Status</span>
          </div>
          <div className="emer-hero-stat">
            <span className="emer-hero-stat-value" style={{ color: heartRate > 120 || heartRate < 50 ? '#ef5350' : '#66bb6a' }}>
              {heartRate} bpm
            </span>
            <span className="emer-hero-stat-label">Heart Rate</span>
          </div>
          <div className="emer-hero-stat">
            <span className="emer-hero-stat-value" style={{ color: spo2 < 92 ? '#ef5350' : '#66bb6a' }}>
              {spo2}%
            </span>
            <span className="emer-hero-stat-label">SpO₂</span>
          </div>
        </div>
      </div>
    </div>
  );
}
