import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import type { DashboardScreen } from "../../api/dashboard";
import "leaflet/dist/leaflet.css";

const onlineIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

const offlineIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

interface NetworkMiniMapCardProps {
  screens: DashboardScreen[];
  isLoading: boolean;
  error: boolean;
}

export default function NetworkMiniMapCard({
  screens,
  isLoading,
  error,
}: NetworkMiniMapCardProps) {
  const navigate = useNavigate();

  const defaultCenter: [number, number] = [6.5244, 3.3792];
  const center: [number, number] = screens.length > 0 && screens[0].latitude && screens[0].longitude
    ? [screens[0].latitude, screens[0].longitude]
    : defaultCenter;

  const onlineCount = screens.filter(s => s.isOnline).length;
  const offlineCount = screens.filter(s => !s.isOnline).length;

  return (
    <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Network Map</h2>
          {!isLoading && !error && (
            <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {onlineCount} online
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                {offlineCount} offline
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate("/inventory/map")}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Open Full Map
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 bg-zinc-100 animate-pulse flex items-center justify-center">
          <span className="text-zinc-500">Loading map...</span>
        </div>
      ) : error ? (
        <div className="h-64 flex items-center justify-center bg-zinc-50">
          <p className="text-red-500 text-sm">Failed to load map</p>
        </div>
      ) : screens.length === 0 ? (
        <div className="h-64 flex items-center justify-center bg-zinc-50">
          <p className="text-zinc-500 text-sm">No screens with coordinates found</p>
        </div>
      ) : (
        <div className="h-64">
          <MapContainer
            center={center}
            zoom={10}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {screens.map(screen => (
              screen.latitude && screen.longitude && (
                <Marker
                  key={screen.id}
                  position={[screen.latitude, screen.longitude]}
                  icon={screen.isOnline ? onlineIcon : offlineIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <div className="font-bold">{screen.code}</div>
                      {screen.name && <div className="text-xs text-gray-600">{screen.name}</div>}
                      <div className={`text-xs mt-1 ${screen.isOnline ? "text-green-600" : "text-red-600"}`}>
                        {screen.isOnline ? "Online" : "Offline"}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
}
