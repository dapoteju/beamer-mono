import { useState, useEffect, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createAdvertiser,
  updateAdvertiser,
  type CreateAdvertiserPayload,
  type UpdateAdvertiserPayload,
  type Advertiser,
} from "../api/advertisers";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
].sort((a, b) => a.name.localeCompare(b.name));

interface AdvertiserFormModalProps {
  mode: "create" | "edit";
  advertiserId?: string;
  advertiser?: Advertiser | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdvertiserFormModal({
  mode,
  advertiserId,
  advertiser,
  onClose,
  onSuccess,
}: AdvertiserFormModalProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (mode === "edit" && advertiser) {
      setName(advertiser.name);
      setCountry(advertiser.country);
      setBillingEmail(advertiser.billingEmail);
    }
    setErrors({});
  }, [mode, advertiser]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateAdvertiserPayload) => createAdvertiser(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create advertiser";
      setErrors({ submit: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateAdvertiserPayload) =>
      updateAdvertiser(advertiserId!, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update advertiser";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!country.trim()) newErrors.country = "Country is required";
    if (!billingEmail.trim()) newErrors.billingEmail = "Billing email is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      const payload: CreateAdvertiserPayload = {
        name: name.trim(),
        country: country.trim(),
        billingEmail: billingEmail.trim(),
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdateAdvertiserPayload = {
        name: name.trim(),
        country: country.trim(),
        billingEmail: billingEmail.trim(),
      };
      updateMutation.mutate(payload);
    }
  };

  const loading = createMutation.isPending || updateMutation.isPending;

  return (
    <div
      className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">
            {mode === "create" ? "Create Advertiser" : "Edit Advertiser"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {errors.submit && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                errors.name ? "border-red-500" : "border-zinc-300"
              }`}
              disabled={loading}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                errors.country ? "border-red-500" : "border-zinc-300"
              }`}
              disabled={loading}
            >
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.country && (
              <p className="mt-1 text-xs text-red-600">{errors.country}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Billing Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                errors.billingEmail ? "border-red-500" : "border-zinc-300"
              }`}
              disabled={loading}
            />
            {errors.billingEmail && (
              <p className="mt-1 text-xs text-red-600">{errors.billingEmail}</p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:bg-zinc-300"
              disabled={loading}
            >
              {loading ? "Saving..." : mode === "create" ? "Create" : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
