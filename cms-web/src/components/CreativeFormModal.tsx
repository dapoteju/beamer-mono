import { useState, useEffect, useRef, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  uploadFile,
  createCreative,
  updateCreative,
  fetchCreativeApprovals,
  updateCreativeApproval,
  type Creative,
  type CreateCreativePayload,
  type UpdateCreativePayload,
  type CreativeStatus,
  type CreativeApproval,
  type CreativeApprovalStatus,
} from "../api/creatives";
import { fetchRegions, type Region } from "../api/screens";
import { useAuthStore } from "../store/authStore";

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
  const { user } = useAuthStore();
  const isInternalUser = user?.orgType === "beamer_internal";

  const [formData, setFormData] = useState({
    name: "",
    duration_seconds: "",
    status: "pending_review" as CreativeStatus,
  });
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const [approvalEdits, setApprovalEdits] = useState<Record<string, {
    status: CreativeApprovalStatus;
    approval_code: string;
    rejected_reason: string;
  }>>({});
  const [savingApproval, setSavingApproval] = useState<string | null>(null);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  const { data: regions = [] } = useQuery<Region[]>({
    queryKey: ["regions"],
    queryFn: fetchRegions,
  });

  const { data: approvals = [], refetch: refetchApprovals } = useQuery<CreativeApproval[]>({
    queryKey: ["creative-approvals", creative?.id],
    queryFn: () => fetchCreativeApprovals(creative!.id),
    enabled: mode === "edit" && !!creative?.id,
  });

  useEffect(() => {
    if (mode === "edit" && creative) {
      setFormData({
        name: creative.name,
        duration_seconds: creative.duration_seconds.toString(),
        status: creative.status,
      });
      setSelectedRegions(creative.regions_required || []);
      setFilePreview(creative.file_url);
    } else {
      setFormData({
        name: "",
        duration_seconds: "",
        status: "pending_review",
      });
      setSelectedRegions([]);
      setSelectedFile(null);
      setFilePreview(null);
    }
    setErrors({});
    setApprovalEdits({});
    setApprovalSuccess(null);
  }, [mode, creative]);

  useEffect(() => {
    if (approvals.length > 0) {
      const edits: Record<string, { status: CreativeApprovalStatus; approval_code: string; rejected_reason: string }> = {};
      approvals.forEach((approval) => {
        edits[approval.region_code] = {
          status: approval.status,
          approval_code: approval.approval_code || "",
          rejected_reason: approval.rejected_reason || "",
        };
      });
      setApprovalEdits(edits);
    }
  }, [approvals]);

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
        regions_required: selectedRegions,
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
        regions_required: selectedRegions,
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

  const handleSaveApproval = async (regionCode: string) => {
    if (!creative) return;
    
    const edit = approvalEdits[regionCode];
    if (!edit) return;

    setSavingApproval(regionCode);
    setApprovalSuccess(null);

    try {
      await updateCreativeApproval(creative.id, {
        region: regionCode,
        status: edit.status,
        approval_code: edit.approval_code || undefined,
        rejected_reason: edit.status === "rejected" ? edit.rejected_reason || undefined : undefined,
      });
      
      await refetchApprovals();
      setApprovalSuccess(regionCode);
      
      setTimeout(() => {
        setApprovalSuccess(null);
      }, 2000);
    } catch (error) {
      console.error("Failed to save approval:", error);
    } finally {
      setSavingApproval(null);
    }
  };

  const getStatusBadgeColor = (status: CreativeApprovalStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const hasPendingApprovals = approvals.some((a) => a.status === "pending");

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

              {isInternalUser && approvals.length > 0 && (
                <div id="region-approvals" className="border-t border-zinc-200 pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Region Approvals</h3>
                  
                  {hasPendingApprovals && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-3 py-2 rounded text-xs mb-3">
                      Some regions are still pending approval. These creatives will not play where pre-approval is required.
                    </div>
                  )}

                  <div className="space-y-4">
                    {approvals.map((approval) => {
                      const edit = approvalEdits[approval.region_code] || {
                        status: approval.status,
                        approval_code: "",
                        rejected_reason: "",
                      };
                      return (
                        <div key={approval.id} className="border border-zinc-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-zinc-900">
                                {approval.region_name} ({approval.region_code})
                              </span>
                              <span
                                className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadgeColor(
                                  edit.status
                                )}`}
                              >
                                {edit.status}
                              </span>
                            </div>
                            {approvalSuccess === approval.region_code && (
                              <span className="text-xs text-green-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Saved
                              </span>
                            )}
                          </div>

                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Status</label>
                              <select
                                value={edit.status}
                                onChange={(e) =>
                                  setApprovalEdits({
                                    ...approvalEdits,
                                    [approval.region_code]: {
                                      ...edit,
                                      status: e.target.value as CreativeApprovalStatus,
                                    },
                                  })
                                }
                                className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={savingApproval === approval.region_code}
                              >
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-zinc-500 mb-1">Approval Code</label>
                              <input
                                type="text"
                                value={edit.approval_code}
                                onChange={(e) =>
                                  setApprovalEdits({
                                    ...approvalEdits,
                                    [approval.region_code]: {
                                      ...edit,
                                      approval_code: e.target.value,
                                    },
                                  })
                                }
                                className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., ARCON-2025-00123"
                                disabled={savingApproval === approval.region_code}
                              />
                              {approval.requires_pre_approval && edit.status === "approved" && !edit.approval_code && (
                                <p className="mt-1 text-xs text-blue-600">
                                  No approval code entered. One will be automatically generated when you approve.
                                </p>
                              )}
                            </div>

                            {edit.status === "rejected" && (
                              <div>
                                <label className="block text-xs text-zinc-500 mb-1">Rejection Reason</label>
                                <input
                                  type="text"
                                  value={edit.rejected_reason}
                                  onChange={(e) =>
                                    setApprovalEdits({
                                      ...approvalEdits,
                                      [approval.region_code]: {
                                        ...edit,
                                        rejected_reason: e.target.value,
                                      },
                                    })
                                  }
                                  className="w-full px-2 py-1.5 text-sm border border-zinc-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="Reason for rejection"
                                  disabled={savingApproval === approval.region_code}
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleSaveApproval(approval.region_code)}
                              disabled={savingApproval === approval.region_code}
                              className="mt-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
                            >
                              {savingApproval === approval.region_code ? "Saving..." : "Save Approval"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Regions Required
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between"
                disabled={isSubmitting}
              >
                <span className={selectedRegions.length === 0 ? "text-zinc-400" : "text-zinc-900"}>
                  {selectedRegions.length === 0
                    ? "Select regions..."
                    : `${selectedRegions.length} region${selectedRegions.length === 1 ? "" : "s"} selected`}
                </span>
                <svg
                  className={`w-4 h-4 text-zinc-500 transition-transform ${regionDropdownOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {regionDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-zinc-300 rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {regions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-zinc-500">No regions available</div>
                  ) : (
                    regions.map((region) => (
                      <label
                        key={region.id}
                        className="flex items-center px-3 py-2 hover:bg-zinc-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRegions.includes(region.code)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRegions([...selectedRegions, region.code]);
                            } else {
                              setSelectedRegions(selectedRegions.filter((r) => r !== region.code));
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 rounded border-zinc-300 focus:ring-blue-500"
                        />
                        <span className="text-sm text-zinc-900">
                          {region.name} ({region.code})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
            {selectedRegions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedRegions.map((code) => {
                  const region = regions.find((r) => r.code === code);
                  return (
                    <span
                      key={code}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {region ? region.name : code}
                      <button
                        type="button"
                        onClick={() => setSelectedRegions(selectedRegions.filter((r) => r !== code))}
                        className="hover:text-blue-600"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-xs text-zinc-500">
              Select the regions where this creative needs approval
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
