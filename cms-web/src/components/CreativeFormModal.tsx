import { useState, useEffect, useRef, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  uploadFile,
  createCreative,
  updateCreative,
  type Creative,
  type CreateCreativePayload,
  type UpdateCreativePayload,
  type CreativeStatus,
} from "../api/creatives";

interface CreativeFormModalProps {
  mode: "create" | "edit";
  campaignId: string;
  creative?: Creative | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreativeFormModal({
  mode,
  campaignId,
  creative,
  onClose,
  onSuccess,
}: CreativeFormModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    duration_seconds: "",
    regions_required: "",
    status: "pending_review" as CreativeStatus,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (mode === "edit" && creative) {
      setFormData({
        name: creative.name,
        duration_seconds: creative.duration_seconds.toString(),
        regions_required: creative.regions_required?.join(", ") || "",
        status: creative.status,
      });
      setFilePreview(creative.file_url);
    } else {
      setFormData({
        name: "",
        duration_seconds: "",
        regions_required: "",
        status: "pending_review",
      });
      setSelectedFile(null);
      setFilePreview(null);
    }
    setErrors({});
  }, [mode, creative]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("No file selected");

      setUploading(true);
      const uploadResult = await uploadFile(selectedFile);

      const payload: CreateCreativePayload = {
        name: formData.name.trim(),
        file_url: uploadResult.file_url,
        mime_type: uploadResult.mime_type,
        duration_seconds: parseInt(formData.duration_seconds) || 0,
        width: mediaDimensions.width,
        height: mediaDimensions.height,
        regions_required: formData.regions_required
          .split(",")
          .map((r) => r.trim().toUpperCase())
          .filter((r) => r.length > 0),
      };

      return createCreative(campaignId, payload);
    },
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || error.message || "Failed to create creative";
      setErrors({ submit: message });
    },
    onSettled: () => {
      setUploading(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCreativePayload) =>
      updateCreative(creative!.id, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update creative";
      setErrors({ submit: message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (mode === "create") {
      if (!selectedFile) {
        newErrors.file = "File is required";
      }
      if (!formData.duration_seconds || parseInt(formData.duration_seconds) <= 0) {
        newErrors.duration_seconds = "Duration must be greater than 0";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      createMutation.mutate();
    } else {
      const payload: UpdateCreativePayload = {
        name: formData.name.trim(),
        status: formData.status,
        regions_required: formData.regions_required
          .split(",")
          .map((r) => r.trim().toUpperCase())
          .filter((r) => r.length > 0),
      };
      updateMutation.mutate(payload);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMediaDimensions({ width: 0, height: 0 });

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          setFilePreview(dataUrl);

          const img = new Image();
          img.onload = () => {
            setMediaDimensions({ width: img.naturalWidth, height: img.naturalHeight });
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith("video/")) {
        const videoUrl = URL.createObjectURL(file);
        setFilePreview(videoUrl);

        const video = document.createElement("video");
        video.onloadedmetadata = () => {
          setMediaDimensions({ width: video.videoWidth, height: video.videoHeight });
          if (video.duration && !formData.duration_seconds) {
            setFormData((prev) => ({
              ...prev,
              duration_seconds: Math.ceil(video.duration).toString(),
            }));
          }
        };
        video.src = videoUrl;
      } else {
        setFilePreview(null);
      }
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending || uploading;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">
            {mode === "create" ? "Add Creative" : "Edit Creative"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-700"
            disabled={isSubmitting}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-300" : "border-zinc-300"
              }`}
              placeholder="e.g., Summer Sale Banner"
              disabled={isSubmitting}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {mode === "create" && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  File <span className="text-red-500">*</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                  onChange={handleFileChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.file ? "border-red-300" : "border-zinc-300"
                  }`}
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Supported: JPEG, PNG, GIF, WebP, MP4, WebM, QuickTime (max 100MB)
                </p>
                {errors.file && <p className="mt-1 text-sm text-red-600">{errors.file}</p>}
              </div>

              {filePreview && (
                <div className="border border-zinc-200 rounded-md p-2">
                  {selectedFile?.type.startsWith("image/") ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-h-40 mx-auto rounded"
                    />
                  ) : selectedFile?.type.startsWith("video/") ? (
                    <video
                      src={filePreview}
                      className="max-h-40 mx-auto rounded"
                      controls
                      muted
                    />
                  ) : null}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Duration (seconds) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({ ...formData, duration_seconds: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.duration_seconds ? "border-red-300" : "border-zinc-300"
                  }`}
                  placeholder="e.g., 15"
                  disabled={isSubmitting}
                />
                {errors.duration_seconds && (
                  <p className="mt-1 text-sm text-red-600">{errors.duration_seconds}</p>
                )}
              </div>
            </>
          )}

          {mode === "edit" && (
            <>
              {filePreview && creative && (
                <div className="border border-zinc-200 rounded-md overflow-hidden">
                  <div className="bg-zinc-100 px-3 py-2 border-b border-zinc-200">
                    <p className="text-xs text-zinc-600">
                      {creative.width} x {creative.height} | {creative.duration_seconds}s
                    </p>
                  </div>
                  <div className="p-2 bg-zinc-50 flex items-center justify-center">
                    {creative.mime_type.startsWith("image/") ? (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded"
                      />
                    ) : creative.mime_type.startsWith("video/") ? (
                      <video
                        src={filePreview}
                        className="max-h-48 mx-auto rounded"
                        controls
                        muted
                      />
                    ) : (
                      <div className="py-8 text-zinc-400 text-sm">Preview not available</div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as CreativeStatus })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  <option value="pending_review">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Regions Required
            </label>
            <input
              type="text"
              value={formData.regions_required}
              onChange={(e) => setFormData({ ...formData, regions_required: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., NG, KE, GH"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Comma-separated region codes
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-zinc-300 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {uploading ? "Uploading..." : "Saving..."}
                </span>
              ) : mode === "create" ? (
                "Add Creative"
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
