import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { fetchScreens } from "../api/screens";
import type { Screen } from "../api/screens";
import { useAuthStore } from "../store/authStore";
import { Link } from "react-router-dom";
import "leaflet/dist/leaflet.css";

const onlineIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const offlineIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function InventoryMap() {
  const { user } = useAuthStore();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>("all");
  const [filterPublisher, setFilterPublisher] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    loadScreens();
  }, []);

  async function loadScreens() {
    try {
      setLoading(true);
      const data = await fetchScreens();
      setScreens(data);
      setError(null);
    } catch (err) {
      console.error("Failed to load screens:", err);
      setError("Failed to load screens");
    } finally {
      setLoading(false);
    }
  }

  const filteredScreens = screens.filter(screen => {
    if (!screen.latitude || !screen.longitude) return false;
    
    if (filterType !== "all" && screen.screenClassification !== filterType) return false;
    
    if (filterPublisher !== "all" && screen.publisherOrgId !== filterPublisher) return false;
    
    if (filterStatus === "online" && !screen.isOnline) return false;
    if (filterStatus === "offline" && screen.isOnline) return false;
    
    return true;
  });

  const publishers = Array.from(new Set(screens.map(s => s.publisherOrgId)))
    .map(id => ({
      id,
      name: screens.find(s => s.publisherOrgId === id)?.publisherOrgName || "Unknown"
    }));

  const defaultCenter: [number, number] = [6.5244, 3.3792];
  const center: [number, number] = filteredScreens.length > 0 && filteredScreens[0].latitude && filteredScreens[0].longitude
    ? [filteredScreens[0].latitude, filteredScreens[0].longitude]
    : defaultCenter;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-white shadow">
        <h1 className="text-2xl font-bold mb-4">Inventory Map</h1>
        
        <div className="flex gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Screen Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All</option>
              <option value="vehicle">Vehicle</option>
              <option value="billboard">Billboard</option>
              <option value="indoor">Indoor</option>
              <option value="other">Other</option>
            </select>
          </div>

          {user?.orgType === "beamer_internal" && (
            <div>
              <label className="block text-sm font-medium mb-1">Publisher</label>
              <select
                value={filterPublisher}
                onChange={(e) => setFilterPublisher(e.target.value)}
                className="px-3 py-2 border rounded"
              >
                <option value="all">All</option>
                {publishers.map(pub => (
                  <option key={pub.id} value={pub.id}>{pub.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border rounded"
            >
              <option value="all">All</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              Showing {filteredScreens.length} of {screens.filter(s => s.latitude && s.longitude).length} screens
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1">
        <MapContainer
          center={center}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {filteredScreens.map(screen => (
            screen.latitude && screen.longitude && (
              <Marker
                key={screen.id}
                position={[screen.latitude, screen.longitude]}
                icon={screen.isOnline ? onlineIcon : offlineIcon}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-bold text-lg mb-2">{screen.code}</div>
                    {screen.name && <div className="text-sm text-gray-600 mb-1">{screen.name}</div>}
                    <div className="text-sm mb-1">
                      <span className="font-medium">Type:</span> {screen.screenClassification || "N/A"}
                    </div>
                    <div className="text-sm mb-1">
                      <span className="font-medium">Publisher:</span> {screen.publisherOrgName}
                    </div>
                    <div className="text-sm mb-2">
                      <span className="font-medium">Status:</span>{" "}
                      <span className={screen.isOnline ? "text-green-600" : "text-red-600"}>
                        {screen.isOnline ? "Online" : "Offline"}
                      </span>
                    </div>
                    {screen.lastSeenAt && (
                      <div className="text-xs text-gray-500 mb-2">
                        Last seen: {new Date(screen.lastSeenAt).toLocaleString()}
                      </div>
                    )}
                    <Link
                      to={`/screens/${screen.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Details →
                    </Link>
                  </div>
                </Popup>
              </Marker>
            )
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
