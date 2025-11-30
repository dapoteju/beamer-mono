import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createCampaign, type CreateCampaignPayload } from "../api/campaigns";
import { fetchAdvertisers } from "../api/advertisers";
import { useAuthStore } from "../store/authStore";
import TargetingEditor from "../components/TargetingEditor";

interface TargetingData {
  cities?: string[];
  regions?: string[];
  screen_groups?: string[];
  time_window?: {
    start_time?: string;
    end_time?: string;
  };
}

export default function CampaignNew() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isInternal = user?.orgType === "beamer_internal";

  const [formData, setFormData] = useState({
    advertiserOrgId: "",
    name: "",
    objective: "",
    startDate: "",
    endDate: "",
    totalBudget: "",
    currency: "NGN",
    status: "draft" as const,
  });
  
  const [targeting, setTargeting] = useState<TargetingData>({});

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: advertisers = [] } = useQuery({
    queryKey: ["advertisers"],
    queryFn: fetchAdvertisers,
    enabled: isInternal,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCampaignPayload) => createCampaign(payload),
    onSuccess: (data) => {
      navigate(`/campaigns/${data.id}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create campaign";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (isInternal && !formData.advertiserOrgId) {
      newErrors.advertiserOrgId = "Advertiser is required";
    }
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

    const payload: CreateCampaignPayload = {
      advertiserOrgId: isInternal ? formData.advertiserOrgId : undefined,
      name: formData.name.trim(),
      objective: formData.objective.trim() || undefined,
      startDate: formData.startDate,
      endDate: formData.endDate,
      totalBudget: parseFloat(formData.totalBudget),
      currency: formData.currency,
      status: formData.status,
      targetingJson: hasTargeting ? targeting : undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={() => navigate("/campaigns")}
          className="text-sm text-zinc-600 hover:text-zinc-900 mb-2"
        >
          ← Back to Campaigns
        </button>
        <h1 className="text-2xl font-semibold text-zinc-900">Create New Campaign</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Define your advertising campaign details
        </p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {isInternal && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Advertiser <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.advertiserOrgId}
                onChange={(e) =>
                  setFormData({ ...formData, advertiserOrgId: e.target.value })
                }
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.advertiserOrgId ? "border-red-500" : "border-zinc-300"
                }`}
              >
                <option value="">Select advertiser...</option>
                {advertisers.map((adv) => (
                  <option key={adv.id} value={adv.id}>
                    {adv.name}
                  </option>
                ))}
              </select>
              {errors.advertiserOrgId && (
                <p className="text-xs text-red-600 mt-1">{errors.advertiserOrgId}</p>
              )}
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
              placeholder="e.g., Summer Promotion 2024"
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
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Brand Awareness, Sales, Engagement"
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
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, totalBudget: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.totalBudget ? "border-red-500" : "border-zinc-300"
                }`}
                placeholder="0.00"
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
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NGN">NGN (Nigerian Naira)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="GBP">GBP (British Pound)</option>
                <option value="EUR">EUR (Euro)</option>
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
                setFormData({ ...formData, status: e.target.value as any })
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
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/campaigns")}
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
