import { useMemo } from "react";
import { z } from "zod";

export const locationSchema = z.tuple([z.number(), z.number()]);

export const transportSchema = z.enum([
  "driving-car",
  "cycling-regular",
  "foot-walking",
]);

export const configItemSchema = z.object({
  id: z.string(),
  location: locationSchema,
  transport: transportSchema,
  range: z.number(),
});

export const configSchema = z.array(configItemSchema);

export type ConfigItem = z.infer<typeof configItemSchema>;

export function useConfig(encodedConfig?: string): ConfigItem[] {
  return useMemo(() => {
    if (!encodedConfig) return [];
    try {
      const parsed = configSchema.parse(JSON.parse(atob(encodedConfig)));
      return parsed;
    } catch {
      return [];
    }
  }, [encodedConfig]);
}
