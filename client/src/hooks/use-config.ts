import { useMemo } from "react";
import { z } from "zod";

const transportSchema = z.enum([
  "driving-car",
  "cycling-regular",
  "foot-walking",
]);

const configItemSchema = z.object({
  id: z.string(),
  location: z.tuple([z.number(), z.number()]),
  transport: transportSchema,
  range: z.number(),
});

const configSchema = z.array(configItemSchema);

export type ConfigItem = z.infer<typeof configItemSchema>;
export { configItemSchema, transportSchema };

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
