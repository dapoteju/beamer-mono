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
  { code: "GH", name: "Ghana" },
  { code: "TZ", name: "Tanzania" },
  { code: "UG", name: "Uganda" },
  { code: "ZW", name: "Zimbabwe" },
  { code: "RW", name: "Rwanda" },
  { code: "ET", name: "Ethiopia" },
  { code: "EG", name: "Egypt" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "DZ", name: "Algeria" },
  { code: "SN", name: "Senegal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "CM", name: "Cameroon" },
  { code: "BW", name: "Botswana" },
  { code: "MU", name: "Mauritius" },
  { code: "NA", name: "Namibia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "GR", name: "Greece" },
  { code: "CZ", name: "Czech Republic" },
  { code: "RO", name: "Romania" },
  { code: "HU", name: "Hungary" },
  { code: "BG", name: "Bulgaria" },
  { code: "SK", name: "Slovakia" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "SG", name: "Singapore" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "ID", name: "Indonesia" },
  { code: "PH", name: "Philippines" },
  { code: "VN", name: "Vietnam" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "LK", name: "Sri Lanka" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "IL", name: "Israel" },
  { code: "TR", name: "Turkey" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "PE", name: "Peru" },
  { code: "VE", name: "Venezuela" },
  { code: "EC", name: "Ecuador" },
  { code: "BO", name: "Bolivia" },
  { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" },
  { code: "CR", name: "Costa Rica" },
  { code: "PA", name: "Panama" },
  { code: "GT", name: "Guatemala" },
  { code: "DO", name: "Dominican Republic" },
  { code: "CU", name: "Cuba" },
  { code: "JM", name: "Jamaica" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "BS", name: "Bahamas" },
  { code: "BB", name: "Barbados" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
].sort((a, b) => a.name.localeCompare(b.name));

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
              Country <span className="text-red-500">*</span>
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Select a country...</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
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
