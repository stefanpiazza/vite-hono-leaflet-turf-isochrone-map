import type { MapHandlers, MapProps } from "@/hooks/use-map";
import {
  GeoJSON,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  useMapEvents,
} from "react-leaflet";

function MapHandlers({ handlers }: { handlers?: MapHandlers }) {
  useMapEvents(handlers || {});
  return null;
}

function Map({
  handlers,
  markers,
  polylines,
  geojson,
  center,
  zoom,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {handlers && <MapHandlers handlers={handlers} />}
      {polylines?.map((polyline) => (
        <Polyline
          key={polyline.key}
          positions={polyline.positions}
          color={polyline.color}
          weight={polyline.weight}
          dashArray={polyline.dashArray}
          opacity={polyline.opacity}
        />
      ))}
      {markers?.map((marker) => (
        <Marker
          key={marker.key}
          position={marker.position}
          draggable={marker.draggable}
          icon={marker.icon}
          eventHandlers={marker.eventHandlers}
        />
      ))}
      {geojson?.map((geo) => (
        <GeoJSON key={geo.key} data={geo.data} style={geo.style} />
      ))}
    </MapContainer>
  );
}

export default Map;
