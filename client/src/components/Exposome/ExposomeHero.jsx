import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ExposomeHero({ aqi = 2, weather = {}, uvIndex = 0 }) {
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

    // Color based on AQI level — green (good) to red (bad)
    const aqiColors = {
      1: new THREE.Color(0x66bb6a), // Good — green
      2: new THREE.Color(0x4fc3f7), // Fair — blue
      3: new THREE.Color(0xffa726), // Moderate — orange
      4: new THREE.Color(0xef5350), // Poor — red
      5: new THREE.Color(0xd32f2f), // Very Poor — dark red
    };

    const particleColor = aqiColors[aqi] || aqiColors[2];
    const particleCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3 + Math.random() * 2;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Velocity — more chaotic with higher AQI
      const speed = 0.002 + (aqi / 5) * 0.008;
      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed;

      sizes[i] = Math.random() * 3 + 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: particleColor,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Inner glow sphere
    const glowGeometry = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.03,
      wireframe: true,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    camera.position.z = 7;

    let time = 0;
    const animate = () => {
      time += 0.005;
      animationRef.current = requestAnimationFrame(animate);

      particles.rotation.y += 0.001;
      particles.rotation.x += 0.0005;
      glow.rotation.y -= 0.002;
      glow.rotation.x += 0.001;

      // Pulse effect
      const scale = 1 + Math.sin(time * 2) * 0.02;
      particles.scale.set(scale, scale, scale);

      // Animate particle positions slightly
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i * 3];
        pos[i * 3 + 1] += velocities[i * 3 + 1];
        pos[i * 3 + 2] += velocities[i * 3 + 2];

        // Keep particles within sphere bounds
        const dist = Math.sqrt(pos[i * 3] ** 2 + pos[i * 3 + 1] ** 2 + pos[i * 3 + 2] ** 2);
        if (dist > 5.5 || dist < 2) {
          velocities[i * 3] *= -1;
          velocities[i * 3 + 1] *= -1;
          velocities[i * 3 + 2] *= -1;
        }
      }
      geometry.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
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
    };
  }, [aqi]);

  const getWeatherEmoji = (desc = '') => {
    const d = desc.toLowerCase();
    if (d.includes('clear')) return '☀️';
    if (d.includes('cloud')) return '⛅';
    if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
    if (d.includes('thunder')) return '⛈️';
    if (d.includes('snow')) return '❄️';
    if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
    return '🌤️';
  };

  const aqiLabels = { 1: 'Good', 2: 'Fair', 3: 'Moderate', 4: 'Poor', 5: 'Very Poor' };

  return (
    <div className="expo-hero">
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
      <div className="expo-hero-overlay">
        <h1 className="expo-hero-title">
          Your <span>Exposome</span> Radar
        </h1>
        <p className="expo-hero-subtitle">
          Real-time environmental health monitoring — weather, air quality, UV, and personalized protection guidance.
        </p>
        <div className="expo-hero-stats">
          <div className="expo-hero-stat">
            <span className="expo-hero-stat-value" style={{ color: getAQIColor(aqi) }}>
              {aqiLabels[aqi] || 'N/A'}
            </span>
            <span className="expo-hero-stat-label">Air Quality</span>
          </div>
          <div className="expo-hero-stat">
            <span className="expo-hero-stat-value">
              {weather.temp !== undefined ? `${weather.temp}°C` : '--'}
            </span>
            <span className="expo-hero-stat-label">Temperature</span>
          </div>
          <div className="expo-hero-stat">
            <span className="expo-hero-stat-value">
              {getWeatherEmoji(weather.description)} {uvIndex}
            </span>
            <span className="expo-hero-stat-label">UV Index</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function getAQIColor(aqi) {
  const colors = { 1: '#66bb6a', 2: '#4fc3f7', 3: '#ffa726', 4: '#ef5350', 5: '#d32f2f' };
  return colors[aqi] || '#4fc3f7';
}
