import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Map from "@/components/ui/map";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type ConfigItem,
  locationSchema,
  transportSchema,
  useConfig,
} from "@/hooks/use-config";
import { useMap } from "@/hooks/use-map";
import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import type { LeafletEvent, LeafletMouseEvent } from "leaflet";
import "leaflet/dist/leaflet.css";
import { useState } from "react";
import { z } from "zod";

type FormState = "create" | "edit";

const searchSchema = z.object({
  config: z.string().optional(),
});

const formValuesSchema = z.object({
  id: z.string(),
  location: locationSchema,
  transport: transportSchema,
  range: z.number(),
});

const generateId = () => Math.random().toString(36).slice(2, 11);

const getRangeOptions = () => {
  const options = [];
  for (let i = 100; i <= 1000; i += 100) {
    options.push(i);
  }
  return options;
};

export const Route = createFileRoute("/")({
  component: Index,
  validateSearch: searchSchema,
});

function Index() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>("create");

  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const config = useConfig(search.config);

  const defaultValues = {
    id: "",
    location: [-0.1276, 51.5074],
    transport: "",
    range: 0,
  };

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const parsedValue = formValuesSchema.parse(value);
      const { id, location, range, transport } = parsedValue;

      const newItem: ConfigItem = {
        id,
        location,
        transport,
        range,
      };

      const existingItem = config.find((item) => item.id === parsedValue.id);
      const updatedConfig = existingItem
        ? config.map((item) => (item.id === parsedValue.id ? newItem : item))
        : [...config, newItem];

      navigate({
        search: { config: btoa(JSON.stringify(updatedConfig)) },
      });

      form.reset();
      setIsDialogOpen(false);
    },
  });

  function handleMapClick(e: LeafletMouseEvent) {
    const { lat: latitude, lng: longitude } = e.latlng;

    form.setFieldValue("id", generateId());
    form.setFieldValue("location", [longitude, latitude]);
    form.setFieldValue("transport", "");
    form.setFieldValue("range", 0);

    setIsDialogOpen(true);
    setFormState("create");
  }

  function handleIsochroneClick(e: LeafletEvent) {
    console.log(e);
  }

  function handleIntersectionClick(e: LeafletEvent) {
    console.log(e);
  }

  function handleMarkerClick(id: string) {
    const marker = config.find((item) => item.id === id);

    if (marker) {
      form.setFieldValue("id", marker.id);
      form.setFieldValue("location", marker.location);
      form.setFieldValue("transport", marker.transport);
      form.setFieldValue("range", marker.range);

      setIsDialogOpen(true);
      setFormState("edit");
    }
  }

  function handleDeleteMarker(id: string) {
    const updatedConfig = config.filter((item) => item.id !== id);
    navigate({
      search: { config: btoa(JSON.stringify(updatedConfig)) },
    });
    form.reset();
    setIsDialogOpen(false);
  }

  function handleMarkerDragEnd(id: string, e: LeafletEvent) {
    const { lat, lng } = e.target.getLatLng();
    const updatedConfig = config.map((item) =>
      item.id === id ? { ...item, location: [lng, lat] } : item,
    );
    navigate({
      search: { config: btoa(JSON.stringify(updatedConfig)) },
    });
  }

  const mapProps = useMap(config, {
    map: { click: handleMapClick },
    marker: { click: handleMarkerClick, dragend: handleMarkerDragEnd },
    isochrone: { click: handleIsochroneClick },
    intersection: { click: handleIntersectionClick },
  });

  return (
    <div className="isolate">
      <Map {...mapProps} />

      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            {formState === "create" && (
              <>
                <DialogTitle>Create Marker</DialogTitle>
                <DialogDescription>
                  Add a new location marker to the map.
                </DialogDescription>
              </>
            )}
            {formState === "edit" && (
              <>
                <DialogTitle>Edit Marker</DialogTitle>
                <DialogDescription>
                  Modify or remove this location marker.
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            className="space-y-6"
          >
            <form.Field
              name="transport"
              validators={{
                onBlur: ({ value }) =>
                  !value ? "Transport type is required" : undefined,
              }}
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="transport">Transport Type</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    onOpenChange={(open) => {
                      if (!open) field.handleBlur();
                    }}
                  >
                    <SelectTrigger id="transport" className="w-full">
                      <SelectValue placeholder="Select a transport type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driving-car">Driving (car)</SelectItem>
                      <SelectItem value="cycling-regular">Cycling</SelectItem>
                      <SelectItem value="foot-walking">Walking</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            />

            <form.Field
              name="range"
              validators={{
                onBlur: ({ value }) =>
                  !value ? "Range is required" : undefined,
              }}
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="range">Range (meters)</Label>
                  <Select
                    value={
                      field.state.value && field.state.value > 0
                        ? field.state.value.toString()
                        : ""
                    }
                    onValueChange={(value) =>
                      field.handleChange(parseInt(value))
                    }
                    onOpenChange={(open) => {
                      if (!open) field.handleBlur();
                    }}
                  >
                    <SelectTrigger id="range" className="w-full">
                      <SelectValue placeholder="Select a range..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getRangeOptions().map((r) => (
                        <SelectItem key={r} value={r.toString()}>
                          {r}m
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {field.state.meta.errors && (
                    <p className="text-sm text-red-500">
                      {field.state.meta.errors[0]}
                    </p>
                  )}
                </div>
              )}
            />

            <div className="space-y-2">
              <Label>Location</Label>
              <div className="border-input bg-muted rounded-md border px-3 py-2">
                <p className="font-mono text-sm">
                  {form.state.values.location[0].toFixed(4)},{" "}
                  {form.state.values.location[1].toFixed(4)}
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              {formState === "create" && <Button type="submit">Create</Button>}
              {formState === "edit" && (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => handleDeleteMarker(form.state.values.id)}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                  >
                    Delete
                  </Button>
                  <Button type="submit">Update</Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
