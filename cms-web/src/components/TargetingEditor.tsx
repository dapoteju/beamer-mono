import { useState } from "react";

interface TargetingData {
  cities?: string[];
  regions?: string[];
  screen_groups?: string[];
  time_window?: {
    start_time?: string;
    end_time?: string;
  };
}

interface TargetingEditorProps {
  value: TargetingData;
  onChange: (targeting: TargetingData) => void;
}

export default function TargetingEditor({ value, onChange }: TargetingEditorProps) {
  const [cityInput, setCityInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [screenGroupInput, setScreenGroupInput] = useState("");

  const addItem = (field: "cities" | "regions" | "screen_groups", inputValue: string, setInput: (v: string) => void) => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    
    const currentItems = value[field] || [];
    if (currentItems.includes(trimmed)) {
      setInput("");
      return;
    }
    
    onChange({
      ...value,
      [field]: [...currentItems, trimmed],
    });
    setInput("");
  };

  const removeItem = (field: "cities" | "regions" | "screen_groups", item: string) => {
    const currentItems = value[field] || [];
    onChange({
      ...value,
      [field]: currentItems.filter((i) => i !== item),
    });
  };

  const updateTimeWindow = (key: "start_time" | "end_time", timeValue: string) => {
    const currentTimeWindow = value.time_window || {};
    const newTimeWindow = { ...currentTimeWindow, [key]: timeValue || undefined };
    
    if (!newTimeWindow.start_time && !newTimeWindow.end_time) {
      const { time_window, ...rest } = value;
      onChange(rest);
    } else {
      onChange({
        ...value,
        time_window: newTimeWindow,
      });
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    field: "cities" | "regions" | "screen_groups",
    inputValue: string,
    setInput: (v: string) => void
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem(field, inputValue, setInput);
    }
  };

  const renderChips = (items: string[] | undefined, field: "cities" | "regions" | "screen_groups") => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(field, item)}
              className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="text-sm font-medium text-zinc-700 mb-3">
        Targeting Criteria
        <span className="font-normal text-zinc-500 ml-2">(Optional)</span>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-1">
          Cities
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "cities", cityInput, setCityInput)}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter city name"
          />
          <button
            type="button"
            onClick={() => addItem("cities", cityInput, setCityInput)}
            className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors text-sm"
          >
            Add
          </button>
        </div>
        {renderChips(value.cities, "cities")}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-1">
          Regions
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={regionInput}
            onChange={(e) => setRegionInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "regions", regionInput, setRegionInput)}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter region name"
          />
          <button
            type="button"
            onClick={() => addItem("regions", regionInput, setRegionInput)}
            className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors text-sm"
          >
            Add
          </button>
        </div>
        {renderChips(value.regions, "regions")}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-1">
          Screen Groups
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={screenGroupInput}
            onChange={(e) => setScreenGroupInput(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, "screen_groups", screenGroupInput, setScreenGroupInput)}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter screen group name"
          />
          <button
            type="button"
            onClick={() => addItem("screen_groups", screenGroupInput, setScreenGroupInput)}
            className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors text-sm"
          >
            Add
          </button>
        </div>
        {renderChips(value.screen_groups, "screen_groups")}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-2">
          Time Window
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Start Time</label>
            <input
              type="time"
              value={value.time_window?.start_time || ""}
              onChange={(e) => updateTimeWindow("start_time", e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">End Time</label>
            <input
              type="time"
              value={value.time_window?.end_time || ""}
              onChange={(e) => updateTimeWindow("end_time", e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">
          Optionally limit ad display to specific hours of the day
        </p>
      </div>
    </div>
  );
}
