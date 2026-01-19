import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

const getCacheKey = (
  transport: string,
  locations: number[][],
  range: number[]
) => {
  return `${transport}:${JSON.stringify(locations)}:${JSON.stringify(range)}`;
};

const getFromCache = (key: string) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
};

const setCache = (key: string, data: unknown) => {
  cache.set(key, { data, timestamp: Date.now() });
};

const CoordinateSchema = z.tuple([z.number(), z.number()]);

const IsochronesRequestSchema = z.object({
  locations: z.array(CoordinateSchema).nonempty(),
  range: z.array(z.number().positive()).nonempty(),
  id: z.string().optional(),
});

const GeometrySchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(CoordinateSchema)),
});

const FeaturePropertiesSchema = z.object({
  group_index: z.number(),
  value: z.number(),
  center: CoordinateSchema,
});

const FeatureSchema = z.object({
  type: z.literal("Feature"),
  geometry: GeometrySchema,
  properties: FeaturePropertiesSchema,
});

const EngineSchema = z.object({
  version: z.string(),
  build_date: z.string(),
  graph_date: z.string(),
  osm_date: z.string(),
});

const QueryMetadataSchema = z.object({
  id: z.string().optional(),
  locations: z.array(CoordinateSchema),
  range: z.array(z.number()),
  transport: z.enum(["driving-car", "cycling-regular", "foot-walking"]),
});

const MetadataSchema = z.object({
  id: z.string().optional(),
  attribution: z.string(),
  service: z.string(),
  timestamp: z.number(),
  query: QueryMetadataSchema,
  engine: EngineSchema,
});

const IsochronesResponseSchema = z.object({
  type: z.literal("FeatureCollection"),
  bbox: z.array(z.number()),
  features: z.array(FeatureSchema),
  metadata: MetadataSchema,
});

const generateMockIsochrones = (
  locations: number[][],
  range: number[],
  id?: string,
  transport?: "driving-car" | "cycling-regular" | "foot-walking"
): z.infer<typeof IsochronesResponseSchema> => {
  const features: z.infer<typeof FeatureSchema>[] = [];

  locations.forEach((location, locIndex) => {
    range.forEach((rangeValue) => {
      // Generate 12-sided circle (dodecagon) with noise
      const radiusDegrees = rangeValue / 1000 / 50; // Rough conversion: 1 degree ≈ 111km
      const points: [number, number][] = [];
      const numPoints = 12;
      const noiseScale = 0.15; // 15% variation in radius

      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        // Add noise to radius
        const noise = (Math.random() - 0.5) * 2 * noiseScale; // Random between -noiseScale and +noiseScale
        const noisyRadius = radiusDegrees * (1 + noise);
        const x =
          location[0] +
          (noisyRadius * Math.cos(angle)) /
            Math.cos((location[1] * Math.PI) / 180);
        const y = location[1] + noisyRadius * Math.sin(angle);
        points.push([x, y]);
      }

      // Close the polygon
      points.push(points[0]);

      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [points],
        },
        properties: {
          group_index: locIndex,
          value: rangeValue,
          center: location as [number, number],
        },
      });
    });
  });

  return {
    type: "FeatureCollection",
    bbox: [-180, -90, 180, 90],
    features,
    metadata: {
      id,
      attribution: "openrouteservice.org | OpenStreetMap contributors",
      service: "isochrones",
      timestamp: Date.now(),
      query: {
        id,
        locations,
        range,
        transport,
      },
      engine: {
        version: "9.5.0",
        build_date: "2025-10-31T12:33:09Z",
        graph_date: "2025-12-28T11:13:32Z",
        osm_date: "2025-12-22T00:59:58Z",
      },
    },
  };
};

export const isochronesRoute = new Hono()
  .post(
    "/driving-car",
    zValidator("json", IsochronesRequestSchema),
    async (c) => {
      try {
        const request = c.req.valid("json");
        const cacheKey = getCacheKey(
          "driving-car",
          request.locations,
          request.range
        );
        const cached = getFromCache(cacheKey);
        if (cached) {
          return c.json(cached);
        }

        // Mock response - 12-sided circles
        const result = generateMockIsochrones(
          request.locations,
          request.range,
          request.id,
          "driving-car"
        );
        setCache(cacheKey, result);
        c.header("Cache-Control", "public, max-age=3600");
        return c.json(result);
      } catch (error) {
        return c.json({ error: (error as Error).message }, 500);
      }
    }
  )
  .post(
    "/foot-walking",
    zValidator("json", IsochronesRequestSchema),
    async (c) => {
      try {
        const request = c.req.valid("json");
        const cacheKey = getCacheKey(
          "foot-walking",
          request.locations,
          request.range
        );
        const cached = getFromCache(cacheKey);
        if (cached) {
          return c.json(cached);
        }

        // Mock response - 12-sided circles
        const result = generateMockIsochrones(
          request.locations,
          request.range,
          request.id,
          "foot-walking"
        );
        setCache(cacheKey, result);
        c.header("Cache-Control", "public, max-age=3600");
        return c.json(result);
      } catch (error) {
        return c.json({ error: (error as Error).message }, 500);
      }
    }
  )
  .post(
    "/cycling-regular",
    zValidator("json", IsochronesRequestSchema),
    async (c) => {
      try {
        const request = c.req.valid("json");
        const cacheKey = getCacheKey(
          "cycling-regular",
          request.locations,
          request.range
        );
        const cached = getFromCache(cacheKey);
        if (cached) {
          return c.json(cached);
        }

        // Mock response - 12-sided circles
        const result = generateMockIsochrones(
          request.locations,
          request.range,
          request.id,
          "cycling-regular"
        );
        setCache(cacheKey, result);
        c.header("Cache-Control", "public, max-age=3600");
        return c.json(result);
      } catch (error) {
        return c.json({ error: (error as Error).message }, 500);
      }
    }
  );
