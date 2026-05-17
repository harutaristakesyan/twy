import { Minus, Plus } from "@gravity-ui/icons";
import { Button, Input, Label, TextField } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import type { Control, FieldValues, Path } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { FormNumberInput, FormTextField } from "@/components/form";
import { AddressAutocomplete, type AddressSuggestion } from "@/features/geocoding";
import type { Location } from "@/features/load/types/load";

const emptyStop = (): Location => ({
  originName: null,
  pickupNumber: null,
  cityZipCode: null,
  phone: null,
  address: "",
  latitude: null,
  longitude: null,
  placeId: null,
});

const stopToSuggestion = (stop: Location): AddressSuggestion | null => {
  if (!stop.address) return null;
  if (stop.latitude === null || stop.latitude === undefined) return null;
  if (stop.longitude === null || stop.longitude === undefined) return null;
  return {
    placeId: stop.placeId ?? `${stop.longitude},${stop.latitude}`,
    displayName: [stop.address, stop.cityZipCode].filter(Boolean).join(", "),
    address: stop.address,
    cityZipCode: stop.cityZipCode ?? null,
    city: null,
    postcode: null,
    country: null,
    latitude: stop.latitude,
    longitude: stop.longitude,
  };
};

export interface LoadStopsFormListProps<T extends FieldValues> {
  control: Control<T>;
  namePrefix: string;
  stops: Location[];
  onChange: (stops: Location[]) => void;
  legLabel: string;
  showPickupNumber?: boolean;
}

export function LoadStopsFormList<T extends FieldValues>({
  control,
  namePrefix,
  stops,
  onChange,
  legLabel,
  showPickupNumber = false,
}: LoadStopsFormListProps<T>): React.ReactElement {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  // useWatch gives the live Controller values (originName, pickupNumber) which
  // useFieldArray.fields does NOT reflect when updated mid-session via Controller.
  // Without this, calling replace() after typing originName would overwrite it with null.
  const liveStops = (useWatch({ control, name: namePrefix as Path<T> }) ?? stops) as Location[];

  const replaceStop = (index: number, next: Location) => {
    onChange(liveStops.map((s, i) => (i === index ? next : s)));
  };

  const handleAddressSelect = (index: number, suggestion: AddressSuggestion | null) => {
    const current = liveStops[index];
    if (!suggestion) {
      replaceStop(index, {
        ...current,
        address: "",
        cityZipCode: null,
        latitude: null,
        longitude: null,
        placeId: null,
      });
      return;
    }
    replaceStop(index, {
      ...current,
      address: suggestion.address || suggestion.displayName,
      cityZipCode: suggestion.cityZipCode,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      placeId: suggestion.placeId,
    });
  };

  const updatePhone = (index: number, value: string | null) => {
    const current = liveStops[index];
    replaceStop(index, { ...current, phone: value });
  };

  const addStop = () => {
    const next = [...liveStops, emptyStop()];
    onChange(next);
    setExpandedIndex(next.length - 1);
  };

  const removeStop = (index: number) => {
    const next = liveStops.filter((_, i) => i !== index);
    onChange(next);
    if (expandedIndex >= next.length) setExpandedIndex(Math.max(0, next.length - 1));
  };

  return (
    <div className="flex flex-col gap-3">
      {stops.map((stop, index) => {
        const isGeocoded = stop.latitude !== null && stop.latitude !== undefined;
        const prefix = `${namePrefix}.${index}`;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: stops have no stable ID
          <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between px-4 py-3 rounded-none text-left"
              onPress={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
            >
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">
                  {legLabel} stop {index + 1}
                </span>
                <span className="text-xs text-gray-500 mt-0.5">
                  {stop.address?.trim() || "No address yet — expand to edit"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {stop.address && !isGeocoded && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    No coordinates
                  </span>
                )}
                {stops.length > 1 && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50"
                    onPress={(e) => {
                      e.continuePropagation();
                      removeStop(index);
                    }}
                    aria-label={`Remove ${legLabel} stop ${index + 1}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </Button>

            {expandedIndex === index && (
              <div className="p-4 grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormTextField
                    control={control}
                    name={`${prefix}.originName` as Path<T>}
                    label="Origin Name"
                    placeholder="Enter origin name"
                  />
                </div>
                <div className="col-span-2">
                  <AddressAutocomplete
                    label={`${legLabel} address *`}
                    value={stopToSuggestion(stop)}
                    onChange={(s) => handleAddressSelect(index, s)}
                  />
                </div>
                <TextField fullWidth>
                  <Label>Phone number</Label>
                  <Input
                    placeholder="Enter phone number"
                    value={stop.phone ?? ""}
                    onChange={(e) => updatePhone(index, e.target.value || null)}
                  />
                </TextField>
                {showPickupNumber && (
                  <FormNumberInput
                    control={control}
                    name={`${prefix}.pickupNumber` as Path<T>}
                    label="Pickup Number"
                    placeholder="Enter pickup number"
                    min="0"
                    step="1"
                  />
                )}
                {isGeocoded && (
                  <div className="flex flex-col justify-end">
                    <span className="text-[11px] text-gray-500">{stop.cityZipCode ?? ""}</span>
                    <span className="text-[11px] text-gray-400">
                      {stop.latitude?.toFixed(5)}, {stop.longitude?.toFixed(5)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button
        variant="ghost"
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-600 hover:border-primary hover:text-primary"
        onPress={addStop}
      >
        <Plus className="h-4 w-4" />
        Add {legLabel} stop
      </Button>
    </div>
  );
}
