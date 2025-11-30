import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchRegions } from "../api/screens";
import { fetchScreenGroups } from "../api/screenGroups";

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

interface DropdownOption {
  id: string;
  label: string;
}

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
  placeholder,
  isLoading,
}: {
  label: string;
  options: DropdownOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  isLoading?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedValues.includes(opt.id)
  );

  const handleSelect = (optionId: string) => {
    onChange([...selectedValues, optionId]);
    setSearchTerm("");
  };

  const handleRemove = (optionId: string) => {
    onChange(selectedValues.filter((v) => v !== optionId));
  };

  const getLabel = (id: string) => {
    const opt = options.find((o) => o.id === id);
    return opt?.label || id;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-zinc-600 mb-1">{label}</label>
      
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedValues.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {getLabel(id)}
              <button
                type="button"
                onClick={() => handleRemove(id)}
                className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={isLoading ? "Loading..." : placeholder}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && !isLoading && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-48 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500 italic">
              {searchTerm ? "No matches found" : "No options available"}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelect(option.id)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 focus:bg-zinc-100 focus:outline-none"
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TargetingEditor({ value, onChange }: TargetingEditorProps) {
  const [cityInput, setCityInput] = useState("");

  const { data: regionsData = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const { data: screenGroupsData, isLoading: screenGroupsLoading } = useQuery({
    queryKey: ["screenGroups"],
    queryFn: () => fetchScreenGroups({ archived: false }),
  });

  const regionOptions: DropdownOption[] = regionsData.map((r) => ({
    id: r.code,
    label: r.name,
  }));

  const screenGroupOptions: DropdownOption[] = (screenGroupsData?.items || []).map((sg) => ({
    id: sg.id,
    label: `${sg.name} (${sg.publisherName})`,
  }));

  const handleRegionsChange = (newRegions: string[]) => {
    onChange({
      ...value,
      regions: newRegions.length > 0 ? newRegions : undefined,
    });
  };

  const handleScreenGroupsChange = (newGroups: string[]) => {
    onChange({
      ...value,
      screen_groups: newGroups.length > 0 ? newGroups : undefined,
    });
  };

  const addCity = () => {
    const trimmed = cityInput.trim();
    if (!trimmed) return;

    const currentCities = value.cities || [];
    if (currentCities.includes(trimmed)) {
      setCityInput("");
      return;
    }

    onChange({
      ...value,
      cities: [...currentCities, trimmed],
    });
    setCityInput("");
  };

  const removeCity = (city: string) => {
    const currentCities = value.cities || [];
    const newCities = currentCities.filter((c) => c !== city);
    onChange({
      ...value,
      cities: newCities.length > 0 ? newCities : undefined,
    });
  };

  const handleCityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCity();
    }
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

  return (
    <div className="space-y-5">
      <div className="text-sm font-medium text-zinc-700 mb-3">
        Targeting Criteria
        <span className="font-normal text-zinc-500 ml-2">(Optional)</span>
      </div>

      <MultiSelectDropdown
        label="Regions"
        options={regionOptions}
        selectedValues={value.regions || []}
        onChange={handleRegionsChange}
        placeholder="Select regions..."
        isLoading={regionsLoading}
      />

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-1">Cities</label>
        
        {(value.cities?.length || 0) > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {value.cities?.map((city) => (
              <span
                key={city}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {city}
                <button
                  type="button"
                  onClick={() => removeCity(city)}
                  className="ml-1 text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={handleCityKeyDown}
            className="flex-1 px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter city name"
          />
          <button
            type="button"
            onClick={addCity}
            className="px-3 py-2 bg-zinc-100 text-zinc-700 rounded-md hover:bg-zinc-200 transition-colors text-sm"
          >
            Add
          </button>
        </div>
      </div>

      <MultiSelectDropdown
        label="Screen Groups"
        options={screenGroupOptions}
        selectedValues={value.screen_groups || []}
        onChange={handleScreenGroupsChange}
        placeholder="Select screen groups..."
        isLoading={screenGroupsLoading}
      />

      <div>
        <label className="block text-sm font-medium text-zinc-600 mb-2">Time Window</label>
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
