import { Minus, Plus } from "@gravity-ui/icons";
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

const fieldClass =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";

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
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            onClick={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {legLabel} stop {index + 1}
              </span>
              <span className="text-xs text-gray-500 mt-0.5">
                {stop.address?.trim() || "No address yet — expand to edit"}
              </span>
            </div>
            {stops.length > 1 && (
              <button
                type="button"
                className="ml-3 p-1 rounded text-red-500 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  removeStop(index);
                }}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            )}
          </button>

          {expandedIndex === index && (
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>
                  City / Zipcode
                  <input
                    className={fieldClass}
                    placeholder="Enter city or zipcode"
                    value={stop.cityZipCode ?? ""}
                    onChange={(e) => updateStop(index, "cityZipCode", e.target.value || null)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Phone Number
                  <input
                    className={fieldClass}
                    placeholder="Enter phone number"
                    value={stop.phone ?? ""}
                    onChange={(e) => updateStop(index, "phone", e.target.value || null)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Select Carrier *
                  <input
                    className={fieldClass}
                    placeholder="Enter carrier"
                    value={stop.carrier}
                    onChange={(e) => updateStop(index, "carrier", e.target.value)}
                  />
                </label>
              </div>
              <div>
                <label className={labelClass}>
                  Name *
                  <input
                    className={fieldClass}
                    placeholder="Enter name"
                    value={stop.name}
                    onChange={(e) => updateStop(index, "name", e.target.value)}
                  />
                </label>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>
                  Address *
                  <textarea
                    className={fieldClass}
                    placeholder="Enter address"
                    rows={3}
                    value={stop.address}
                    onChange={(e) => updateStop(index, "address", e.target.value)}
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        type="button"
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-600 hover:border-primary hover:text-primary transition-colors"
        onClick={addStop}
      >
        <Plus className="h-4 w-4" />
        Add {legLabel} stop
      </button>
    </div>
  );
};
