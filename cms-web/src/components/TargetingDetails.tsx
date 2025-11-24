interface TargetingDetailsProps {
  targetingJson: any;
}

export default function TargetingDetails({ targetingJson }: TargetingDetailsProps) {
  if (!targetingJson || Object.keys(targetingJson).length === 0) {
    return (
      <div className="text-sm text-zinc-500 italic">
        No targeting applied
      </div>
    );
  }

  const renderChips = (items: string[] | undefined, label: string) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-700 mb-2">{label}:</div>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderTimeWindow = (timeWindow: any) => {
    if (!timeWindow) return null;

    const { startTime, endTime } = timeWindow;
    if (!startTime || !endTime) return null;

    return (
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-700 mb-2">Time Window:</div>
        <div className="text-sm text-zinc-900">
          {startTime} – {endTime}
        </div>
      </div>
    );
  };

  const renderList = (items: string[] | undefined, label: string) => {
    if (!items || items.length === 0) return null;

    return (
      <div className="mb-3">
        <div className="text-sm font-medium text-zinc-700 mb-2">{label}:</div>
        <div className="text-sm text-zinc-900">
          {items.join(", ")}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {renderChips(targetingJson.cities, "Cities")}
      {renderChips(targetingJson.regions, "Regions")}
      {renderList(targetingJson.screenGroups, "Screen Groups")}
      {renderList(targetingJson.screen_groups, "Screen Groups")}
      {renderTimeWindow(targetingJson.timeWindow)}
      {renderTimeWindow(targetingJson.time_window)}
    </div>
  );
}
