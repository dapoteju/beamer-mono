import { useState, useEffect, type FormEvent } from "react";
import {
  createOrganisation,
  updateOrganisation,
  type CreateOrganisationPayload,
  type Organisation,
} from "../api/organisations";

interface OrganisationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organisation?: Organisation | null;
  mode: "create" | "edit";
}

export default function OrganisationFormModal({
  isOpen,
  onClose,
  onSuccess,
  organisation,
  mode,
}: OrganisationFormModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"advertiser" | "publisher">("advertiser");
  const [country, setCountry] = useState("");
  const [billingEmail, setBillingEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "edit" && organisation) {
      setName(organisation.name);
      setType(organisation.type === "beamer_internal" ? "advertiser" : organisation.type);
      setCountry(organisation.country);
      setBillingEmail(organisation.billing_email);
    } else {
      setName("");
      setType("advertiser");
      setCountry("");
      setBillingEmail("");
    }
    setError(null);
  }, [mode, organisation, isOpen]);

  const isInternalOrg = organisation?.type === "beamer_internal";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!name.trim()) {
      setError("Organisation name is required");
      return;
    }
    if (!country.trim()) {
      setError("Country code is required");
      return;
    }
    if (!billingEmail.trim()) {
      setError("Billing email is required");
      return;
    }

    setLoading(true);

    try {
      if (mode === "create") {
        const payload: CreateOrganisationPayload = {
          name: name.trim(),
          type,
          country: country.trim(),
          billing_email: billingEmail.trim(),
        };
        await createOrganisation(payload);
      } else if (mode === "edit" && organisation) {
        // For beamer_internal orgs, don't include type in the update payload
        const payload = isInternalOrg
          ? {
              name: name.trim(),
              country: country.trim(),
              billing_email: billingEmail.trim(),
            }
          : {
              name: name.trim(),
              type,
              country: country.trim(),
              billing_email: billingEmail.trim(),
            };
        await updateOrganisation(organisation.id, payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Failed to save organisation:", err);
      setError(
        err.response?.data?.error || "Failed to save organisation. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-zinc-900">
            {mode === "create" ? "Create Organisation" : "Edit Organisation"}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
            disabled={loading}
          >
            ×
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="Acme Corporation"
              disabled={loading}
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-zinc-700 mb-1">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value as "advertiser" | "publisher")}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading || isInternalOrg}
            >
              <option value="advertiser">Advertiser</option>
              <option value="publisher">Publisher</option>
            </select>
            {isInternalOrg && (
              <p className="text-xs text-zinc-500 mt-1">
                Cannot change type of internal organisations
              </p>
            )}
          </div>

          <div>
            <label htmlFor="country" className="block text-sm font-medium text-zinc-700 mb-1">
              Country (ISO Code) <span className="text-red-500">*</span>
            </label>
            <input
              id="country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              required
              maxLength={2}
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="US"
              disabled={loading}
            />
            <p className="text-xs text-zinc-500 mt-1">2-letter ISO country code (e.g., US, GB, NG)</p>
          </div>

          <div>
            <label htmlFor="billingEmail" className="block text-sm font-medium text-zinc-700 mb-1">
              Billing Email <span className="text-red-500">*</span>
            </label>
            <input
              id="billingEmail"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              placeholder="billing@example.com"
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
              {loading ? "Saving..." : mode === "create" ? "Create" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
