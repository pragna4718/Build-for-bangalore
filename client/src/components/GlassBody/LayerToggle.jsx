import { motion } from "framer-motion";

const containerStyle = {
  position: "absolute",
  top: "20px",
  left: "20px",
  zIndex: 50,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const btnBase = {
  padding: "8px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(68, 136, 255, 0.25)",
  background: "rgba(10, 10, 20, 0.85)",
  backdropFilter: "blur(10px)",
  color: "#ccc",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 500,
  display: "flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s",
  letterSpacing: "0.5px",
};

const activeStyle = {
  ...btnBase,
  background: "rgba(68, 136, 255, 0.2)",
  borderColor: "rgba(68, 136, 255, 0.6)",
  color: "#fff",
  boxShadow: "0 0 15px rgba(68, 136, 255, 0.15)",
};

const layers = [
  { key: "skeleton", label: "Skeleton", icon: "🦴" },
  { key: "muscles", label: "Muscles", icon: "💪" },
  { key: "organs", label: "Organs", icon: "🫀" },
];

export default function LayerToggle({ activeLayers, onToggle }) {
  return (
    <div style={containerStyle}>
      <div style={{ fontSize: "0.65rem", color: "#666", textTransform: "uppercase", letterSpacing: "1.5px", marginBottom: "4px", paddingLeft: "4px" }}>
        Layers
      </div>
      {layers.map((layer) => {
        const isActive = activeLayers[layer.key];
        return (
          <motion.button
            key={layer.key}
            style={isActive ? activeStyle : btnBase}
            onClick={() => onToggle(layer.key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>{layer.icon}</span>
            <span>{layer.label}</span>
            <span style={{
              marginLeft: "auto",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: isActive ? "#44ff88" : "#444",
              boxShadow: isActive ? "0 0 6px #44ff88" : "none",
            }} />
          </motion.button>
        );
      })}
    </div>
  );
}
