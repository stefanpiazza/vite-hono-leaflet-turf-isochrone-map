import { createIsochroneQueryOptions } from "@/lib/api";
import { useQueries } from "@tanstack/react-query";
import { featureCollection, intersect, polygon } from "@turf/turf";
import type { GeoJsonObject } from "geojson";
import type { LeafletEvent, LeafletMouseEvent } from "leaflet";
import L from "leaflet";
import { useMemo, useState } from "react";
import type { ConfigItem } from "./use-config";

export interface MapHandlers {
  click?: (e: LeafletMouseEvent) => void;
}

export interface MarkerHandlers {
  click?: (id: string, e: LeafletEvent) => void;
  dragstart?: (id: string, e: LeafletEvent) => void;
  drag?: (id: string, e: LeafletEvent) => void;
  dragend?: (id: string, e: LeafletEvent) => void;
}

export interface IsochroneHandlers {
  click?: (e: LeafletEvent) => void;
}

export interface IntersectionHandlers {
  click?: (e: LeafletEvent) => void;
}

export interface MapMarker {
  key: string;
  id: string;
  position: [number, number];
  draggable?: boolean;
  icon?: L.DivIcon;
  eventHandlers?: Partial<
    Record<
      "dragstart" | "drag" | "dragend" | "click",
      (e: LeafletEvent) => void
    >
  >;
}

export interface MapPolyline {
  key: string;
  positions: [number, number][];
  color?: string;
  weight?: number;
  dashArray?: string;
  opacity?: number;
}

export interface MapGeoJson {
  key: string;
  data: GeoJsonObject;
  style?: L.PathOptions;
  eventHandlers?: Partial<Record<"click", (e: LeafletEvent) => void>>;
}

export interface MapProps {
  handlers?: MapHandlers;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  geojson?: MapGeoJson[];
  center?: [number, number];
  zoom?: number;
}

export const MAP_DEFAULT_CENTER: [number, number] = [51.5074, -0.1278]; // London
export const MAP_DEFAULT_ZOOM = 11;

const transportColors: Record<ConfigItem["transport"], string> = {
  "driving-car": "#3b82f6",
  "foot-walking": "#10b981",
  "cycling-regular": "#f59e0b",
};

const createDotIcon = (color: string) => {
  return L.divIcon({
    className: "dot-marker",
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid ${color}; box-shadow: 0 0 0 2px white;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

function useMarkers(config: ConfigItem[]): MapMarker[] {
  return useMemo(() => {
    if (!config || config.length === 0) return [];
    return config.map((item) => ({
      key: `marker-${item.location}`,
      id: item.id,
      position: [item.location[1], item.location[0]], // [lat, lon]
      draggable: true,
      icon: createDotIcon(transportColors[item.transport]),
    }));
  }, [config]);
}

function useMarkersWithHandlers(
  markers: MapMarker[],
  handlers?: MarkerHandlers,
): MapMarker[] {
  return useMemo(() => {
    if (!handlers) return markers;

    return markers.map((marker) => ({
      ...marker,
      eventHandlers: {
        click: (e: LeafletEvent) => {
          handlers.click?.(marker.id, e);
        },
        dragstart: (e: LeafletEvent) => {
          handlers.dragstart?.(marker.id, e);
        },
        drag: (e: LeafletEvent) => {
          handlers.drag?.(marker.id, e);
        },
        dragend: (e: LeafletEvent) => {
          handlers.dragend?.(marker.id, e);
        },
      },
    }));
  }, [markers, handlers]);
}

function useGeoJson(config: ConfigItem[]): MapGeoJson[] {
  const geojson = useQueries({
    queries: config.map((item) => createIsochroneQueryOptions(item)) ?? [],
    combine: (results) => {
      const features: MapGeoJson[] = [];

      results.forEach((result) => {
        const data = result.data;
        if (!data) return;

        const feature = data.features?.[0];
        const locations = data.metadata?.query?.locations;
        const transport = data.metadata?.query?.transport;

        if (feature && transport && locations) {
          features.push({
            key: `geojson-${locations[0].join(",")}`,
            data: feature,
            style: {
              color: transportColors[transport],
              weight: 1,
              opacity: 1,
              fillOpacity: 0.25,
            },
          });
        }
      });

      return features;
    },
  });

  return geojson;
}

function useGeoJsonWithHandlers(
  geojson: MapGeoJson[],
  handlers?: IsochroneHandlers,
): MapGeoJson[] {
  return useMemo(() => {
    if (!handlers) return geojson;

    return geojson.map((geo) => ({
      ...geo,
      eventHandlers: {
        click: (e: LeafletEvent) => {
          handlers.click?.(e);
        },
      },
    }));
  }, [geojson, handlers]);
}

function usePolylines(
  polyline: { from: [number, number]; to: [number, number] } | null,
): MapPolyline[] {
  if (!polyline) return [];
  return [
    {
      key: "polyline",
      positions: [
        [polyline.from[1], polyline.from[0]],
        [polyline.to[1], polyline.to[0]],
      ],
      color: "#666",
      weight: 2,
      dashArray: "5, 5",
      opacity: 0.7,
    },
  ];
}

function useIntersections(config: ConfigItem[]): MapGeoJson[] {
  const intersections = useQueries({
    queries: config.map((item) => createIsochroneQueryOptions(item)) ?? [],
    combine: (results) => {
      const intersections: MapGeoJson[] = [];

      for (let i = 0; i < results.length; i++) {
        const dataI = results[i].data;
        if (!dataI) continue;

        for (let j = i + 1; j < results.length; j++) {
          const dataJ = results[j].data;
          if (!dataJ) continue;

          const coordsI = dataI.features[0].geometry?.coordinates;
          const coordsJ = dataJ.features[0].geometry?.coordinates;
          if (!coordsI || !coordsJ) continue;

          const polygon1 = polygon(coordsI);
          const polygon2 = polygon(coordsJ);

          const intersection = intersect(
            featureCollection([polygon1, polygon2]),
          );

          if (intersection) {
            intersections.push({
              key: `intersection-${coordsI[0][0].join(",")}-${coordsJ[0][0].join(",")}`,
              data: intersection,
              style: {
                color: "#8b5cf6",
                weight: 2,
                opacity: 1,
                fillOpacity: 0.4,
              },
            });
          }
        }
      }

      return intersections;
    },
  });

  return intersections;
}

function useIntersectionsWithHandlers(
  intersections: MapGeoJson[],
  handlers?: IntersectionHandlers,
): MapGeoJson[] {
  return useMemo(() => {
    if (!handlers) return intersections;

    return intersections.map((intersection) => ({
      ...intersection,
      eventHandlers: {
        click: (e: LeafletEvent) => {
          handlers.click?.(e);
        },
      },
    }));
  }, [intersections, handlers]);
}

export function useMap(
  config: ConfigItem[] = [],
  handlers?: {
    marker?: MarkerHandlers;
    map?: MapHandlers;
    isochrone?: IsochroneHandlers;
    intersection?: IntersectionHandlers;
  },
): MapProps {
  const [polyline, setPolyline] = useState<{
    from: [number, number];
    to: [number, number];
  } | null>(null);

  const markerHandlers: MarkerHandlers = useMemo(
    () => ({
      click: (id: string, e: LeafletEvent) => {
        handlers?.marker?.click?.(id, e);
      },
      dragstart: (id: string, e: LeafletEvent) => {
        const { lat, lng } = e.target.getLatLng();
        setPolyline({ from: [lng, lat], to: [lng, lat] });
        handlers?.marker?.dragstart?.(id, e);
      },
      drag: (id: string, e: LeafletEvent) => {
        const { lat, lng } = e.target.getLatLng();
        setPolyline((prev) => (prev ? { ...prev, to: [lng, lat] } : null));
        handlers?.marker?.drag?.(id, e);
      },
      dragend: (id: string, e: LeafletEvent) => {
        setPolyline(null);
        handlers?.marker?.dragend?.(id, e);
      },
    }),
    [handlers?.marker],
  );

  const isochroneHandlers: IsochroneHandlers = useMemo(
    () => ({
      click: (e: LeafletEvent) => {
        handlers?.isochrone?.click?.(e);
      },
    }),
    [handlers?.isochrone],
  );

  const intersectionHandlers: IntersectionHandlers = useMemo(
    () => ({
      click: (e: LeafletEvent) => {
        handlers?.intersection?.click?.(e);
      },
    }),
    [handlers?.intersection],
  );

  const markers = useMarkers(config);
  const markersWithHandlers = useMarkersWithHandlers(markers, markerHandlers);
  const geojson = useGeoJson(config);
  const geojsonWithHandlers = useGeoJsonWithHandlers(
    geojson,
    isochroneHandlers,
  );
  const intersections = useIntersections(config);
  const intersectionsWithHandlers = useIntersectionsWithHandlers(
    intersections,
    intersectionHandlers,
  );
  const polylines = usePolylines(polyline);

  const mapHandlers: MapHandlers = handlers?.map?.click
    ? { click: handlers.map.click }
    : {};

  return {
    handlers: mapHandlers,
    markers: markersWithHandlers,
    polylines,
    geojson: [...geojsonWithHandlers, ...intersectionsWithHandlers],
    center: MAP_DEFAULT_CENTER,
    zoom: MAP_DEFAULT_ZOOM,
  };
}
