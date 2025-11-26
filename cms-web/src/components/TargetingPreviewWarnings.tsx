import { useEffect, useState } from "react";
import { fetchTargetingPreview, type TargetingPreview, type TargetingPreviewWarning } from "../api/screenGroups";

interface TargetingPreviewWarningsProps {
  groupIds: string[];
  className?: string;
}

function getWarningIcon(type: TargetingPreviewWarning["type"]) {
  switch (type) {
    case "overlap":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case "offline":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
        </svg>
      );
    case "mixed_resolution":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    case "low_screen_count":
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    default:
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
  }
}

function getWarningStyles(type: TargetingPreviewWarning["type"]) {
  switch (type) {
    case "overlap":
      return "bg-blue-50 border-blue-200 text-blue-800";
    case "offline":
      return "bg-red-50 border-red-200 text-red-800";
    case "mixed_resolution":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "low_screen_count":
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
    default:
      return "bg-yellow-50 border-yellow-200 text-yellow-800";
  }
}

export function TargetingPreviewWarnings({ groupIds, className = "" }: TargetingPreviewWarningsProps) {
  const [preview, setPreview] = useState<TargetingPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      if (groupIds.length === 0) {
        setPreview(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await fetchTargetingPreview(groupIds);
        setPreview(data);
      } catch (err: any) {
        console.error("Failed to fetch targeting preview:", err);
        setError(err.response?.data?.error || "Failed to load preview");
        setPreview(null);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timer);
  }, [groupIds.join(",")]);

  if (loading) {
    return (
      <div className={`text-xs text-zinc-500 ${className}`}>
        Loading targeting preview...
      </div>
    );
  }

  if (error) {
    return null;
  }

  if (!preview) {
    return null;
  }

  const hasWarnings = preview.warnings.length > 0;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2 text-xs text-zinc-600">
        <span className="font-medium">
          {preview.eligible_screen_count} eligible screen{preview.eligible_screen_count !== 1 ? "s" : ""}
        </span>
        <span className="text-zinc-400">•</span>
        <span className="text-green-600">{preview.onlineScreens} online</span>
        <span className="text-zinc-400">•</span>
        <span className="text-red-600">{preview.offlineScreens} offline</span>
      </div>

      {hasWarnings && (
        <div className="space-y-1.5">
          {preview.warnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 px-3 py-2 text-xs rounded border ${getWarningStyles(warning.type)}`}
            >
              <span className="flex-shrink-0 mt-0.5">{getWarningIcon(warning.type)}</span>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TargetingPreviewSummary({ preview }: { preview: TargetingPreview }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="font-medium text-zinc-900">{preview.eligible_screen_count}</span>
          <span className="text-zinc-500 ml-1">eligible screens</span>
        </div>
        <div className="text-green-600">
          <span className="font-medium">{preview.onlineScreens}</span> online
        </div>
        <div className="text-red-600">
          <span className="font-medium">{preview.offlineScreens}</span> offline
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <div className="space-y-1.5">
          {preview.warnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 px-3 py-2 text-xs rounded border ${getWarningStyles(warning.type)}`}
            >
              <span className="flex-shrink-0 mt-0.5">{getWarningIcon(warning.type)}</span>
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
