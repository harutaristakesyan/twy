import { Minus, Plus } from "@gravity-ui/icons";
import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import type React from "react";
import { useState } from "react";
import type { Location } from "@/features/load/types/load";

const emptyStop = (): Location => ({
  cityZipCode: null,
  phone: null,
  carrier: "",
  name: "",
  address: "",
});

export interface LoadStopsFormListProps {
  stops: Location[];
  onChange: (stops: Location[]) => void;
  legLabel: string;
}

export const LoadStopsFormList: React.FC<LoadStopsFormListProps> = ({
  stops,
  onChange,
  legLabel,
}) => {
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const updateStop = (index: number, field: keyof Location, value: string | null) => {
    const next = stops.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(next);
  };

  const addStop = () => {
    const next = [...stops, emptyStop()];
    onChange(next);
    setExpandedIndex(next.length - 1);
  };

  const removeStop = (index: number) => {
    const next = stops.filter((_, i) => i !== index);
    onChange(next);
    if (expandedIndex >= next.length) setExpandedIndex(Math.max(0, next.length - 1));
  };

  return (
    <div className="flex flex-col gap-3">
      {stops.map((stop, index) => (
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
            {stops.length > 1 && (
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="ml-3 text-red-500 hover:bg-red-50"
                onPress={(e) => {
                  e.continuePropagation();
                  removeStop(index);
                }}
                aria-label={`Remove ${legLabel} stop ${index + 1}`}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
            )}
          </Button>

          {expandedIndex === index && (
            <div className="p-4 grid grid-cols-2 gap-4">
              <TextField fullWidth>
                <Label>City / Zipcode</Label>
                <Input
                  placeholder="Enter city or zipcode"
                  value={stop.cityZipCode ?? ""}
                  onChange={(e) => updateStop(index, "cityZipCode", e.target.value || null)}
                />
              </TextField>
              <TextField fullWidth>
                <Label>Phone Number</Label>
                <Input
                  placeholder="Enter phone number"
                  value={stop.phone ?? ""}
                  onChange={(e) => updateStop(index, "phone", e.target.value || null)}
                />
              </TextField>
              <TextField fullWidth>
                <Label>Select Carrier *</Label>
                <Input
                  placeholder="Enter carrier"
                  value={stop.carrier}
                  onChange={(e) => updateStop(index, "carrier", e.target.value)}
                />
              </TextField>
              <TextField fullWidth>
                <Label>Name *</Label>
                <Input
                  placeholder="Enter name"
                  value={stop.name}
                  onChange={(e) => updateStop(index, "name", e.target.value)}
                />
              </TextField>
              <div className="col-span-2">
                <TextField fullWidth>
                  <Label>Address *</Label>
                  <TextArea
                    placeholder="Enter address"
                    rows={3}
                    value={stop.address}
                    onChange={(e) => updateStop(index, "address", e.target.value)}
                  />
                </TextField>
              </div>
            </div>
          )}
        </div>
      ))}

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
};
