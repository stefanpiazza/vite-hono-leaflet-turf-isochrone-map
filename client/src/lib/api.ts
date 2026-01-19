import type { IsochronesRoutes } from "@server/app";
import { hc } from "hono/client";

const client = hc<IsochronesRoutes>("/");

export const api = client.api;

export interface ConfigItem {
  id: string;
  location: [number, number];
  transport: "driving-car" | "cycling-regular" | "foot-walking";
  range: number;
}

export const createIsochroneQueryOptions = (item: ConfigItem) => ({
  queryKey: ["isochrones", item.id, item.location, item.transport, item.range],
  queryFn: async () => {
    const response = await api.isochrones[item.transport].$post({
      json: {
        locations: [item.location],
        range: [item.range],
        id: item.id,
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    return response.json();
  },
});
