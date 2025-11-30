import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  updateCampaign,
  type UpdateCampaignPayload,
  type CampaignStatus,
} from "../api/campaigns";
import TargetingEditor from "./TargetingEditor";

interface TargetingData {
  cities?: string[];
  regions?: string[];
  screen_groups?: string[];
  time_window?: {
    start_time?: string;
    end_time?: string;
  };
}

interface CampaignFormModalProps {
  mode: "edit";
  campaignId: string;
  initialValues: {
    name: string;
    objective?: string | null;
    startDate: string;
    endDate: string;
    totalBudget: number;
    currency: string;
    status: CampaignStatus;
    targetingJson?: any;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export function CampaignFormModal({
  campaignId,
  initialValues,
  onClose,
  onSuccess,
}: CampaignFormModalProps) {
  const [formData, setFormData] = useState({
    name: initialValues.name,
    objective: initialValues.objective || "",
    startDate: initialValues.startDate,
    endDate: initialValues.endDate,
    totalBudget: initialValues.totalBudget.toString(),
    currency: initialValues.currency,
    status: initialValues.status,
  });

  const [targeting, setTargeting] = useState<TargetingData>(
    initialValues.targetingJson || {}
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCampaignPayload) =>
      updateCampaign(campaignId, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update campaign";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Campaign name is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!formData.totalBudget || parseFloat(formData.totalBudget) <= 0) {
      newErrors.totalBudget = "Budget must be greater than 0";
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    const hasTargeting =
      (targeting.cities && targeting.cities.length > 0) ||
      (targeting.regions && targeting.regions.length > 0) ||
      (targeting.screen_groups && targeting.screen_groups.length > 0) ||
      (targeting.time_window?.start_time || targeting.time_window?.end_time);

    const payload: UpdateCampaignPayload = {
      name: formData.name.trim(),
      objective: formData.objective.trim() || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalBudget: parseFloat(formData.totalBudget),
      currency: formData.currency,
      status: formData.status,
      targetingJson: hasTargeting ? targeting : undefined,
    };

    updateMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">Edit Campaign</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-zinc-300"
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Objective
            </label>
            <input
              type="text"
              value={formData.objective}
              onChange={(e) =>
                setFormData({ ...formData, objective: e.target.value })
              }
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.startDate ? "border-red-500" : "border-zinc-300"
                }`}
              />
              {errors.startDate && (
                <p className="text-xs text-red-600 mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                End Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.endDate ? "border-red-500" : "border-zinc-300"
                }`}
              />
              {errors.endDate && (
                <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Total Budget <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalBudget}
                onChange={(e) =>
                  setFormData({ ...formData, totalBudget: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.totalBudget ? "border-red-500" : "border-zinc-300"
                }`}
              />
              {errors.totalBudget && (
                <p className="text-xs text-red-600 mt-1">{errors.totalBudget}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) =>
                  setFormData({ ...formData, currency: e.target.value })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NGN">NGN</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as CampaignStatus })
              }
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="border-t border-zinc-200 pt-5">
            <TargetingEditor value={targeting} onChange={setTargeting} />
          </div>

          <div className="flex gap-3 pt-4 border-t border-zinc-200">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
