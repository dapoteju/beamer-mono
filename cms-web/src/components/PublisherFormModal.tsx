import { useState, useEffect, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  createPublisher,
  updatePublisher,
  fetchPublisherOrganisations,
  type CreatePublisherPayload,
  type UpdatePublisherPayload,
  type PublisherProfile,
} from "../api/publishers";

interface PublisherFormModalProps {
  mode: "create" | "edit";
  publisherId?: string;
  publisher?: PublisherProfile | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublisherFormModal({
  mode,
  publisherId,
  publisher,
  onClose,
  onSuccess,
}: PublisherFormModalProps) {
  const [publisherType, setPublisherType] = useState<"organisation" | "individual">("organisation");
  const [organisationId, setOrganisationId] = useState("");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [organisations, setOrganisations] = useState<{id: string; name: string}[]>([]);

  useEffect(() => {
    if (mode === "edit" && publisher) {
      setPublisherType(publisher.publisherType);
      setOrganisationId(publisher.organisationId || "");
      setFullName(publisher.fullName || "");
      setPhoneNumber(publisher.phoneNumber || "");
      setEmail(publisher.email || "");
      setAddress(publisher.address || "");
      setNotes(publisher.notes || "");
    }
    setErrors({});
  }, [mode, publisher]);

  useEffect(() => {
    async function loadOrganisations() {
      try {
        const data = await fetchPublisherOrganisations();
        setOrganisations(data);
      } catch (err) {
        console.error("Failed to fetch publisher organisations:", err);
      }
    }
    loadOrganisations();
  }, []);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePublisherPayload) => createPublisher(payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to create publisher";
      setErrors({ submit: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePublisherPayload) =>
      updatePublisher(publisherId!, payload),
    onSuccess: () => {
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || "Failed to update publisher";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (publisherType === "organisation" && !organisationId) {
      newErrors.organisationId = "Organisation is required for organisation publishers";
    }
    if (publisherType === "individual" && !fullName.trim()) {
      newErrors.fullName = "Full name is required for individual publishers";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    if (mode === "create") {
      const payload: CreatePublisherPayload = {
        publisherType,
        organisationId: organisationId || undefined,
        fullName: fullName || undefined,
        phoneNumber: phoneNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
      };
      createMutation.mutate(payload);
    } else {
      const payload: UpdatePublisherPayload = {
        publisherType,
        organisationId: organisationId || undefined,
        fullName: fullName || undefined,
        phoneNumber: phoneNumber || undefined,
        email: email || undefined,
        address: address || undefined,
        notes: notes || undefined,
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
        className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">
            {mode === "create" ? "Create Publisher" : "Edit Publisher"}
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
              Publisher Type
            </label>
            <select
              value={publisherType}
              onChange={(e) => setPublisherType(e.target.value as "organisation" | "individual")}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            >
              <option value="organisation">Organisation</option>
              <option value="individual">Individual</option>
            </select>
          </div>

          {publisherType === "organisation" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Organisation <span className="text-red-500">*</span>
              </label>
              <select
                value={organisationId}
                onChange={(e) => setOrganisationId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.organisationId ? "border-red-500" : "border-zinc-300"
                }`}
                disabled={loading}
              >
                <option value="">Select organisation</option>
                {organisations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
              {errors.organisationId && (
                <p className="mt-1 text-xs text-red-600">{errors.organisationId}</p>
              )}
            </div>
          )}

          {publisherType === "individual" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                  errors.fullName ? "border-red-500" : "border-zinc-300"
                }`}
                disabled={loading}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={loading}
            />
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
              {loading ? "Saving..." : mode === "create" ? "Create Publisher" : "Update Publisher"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
