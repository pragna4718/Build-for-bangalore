import Navbar from "../components/Shared/Navbar";
import GlassBodyViewer from "../components/GlassBody/GlassBodyViewer";

export default function GlassBody() {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#060612" }}>
      <Navbar />
      <div style={{ flex: 1, position: "relative" }}>
        <GlassBodyViewer />
      </div>
    </div>
  );
}
