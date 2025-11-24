import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createBooking,
  updateBooking,
  type Booking,
  type CreateBookingPayload,
  type UpdateBookingPayload,
  type BillingModel,
  type BookingStatus,
} from "../api/bookings";

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  advertiserOrgId: string;
  booking?: Booking | null;
}

export default function BookingFormModal({
  isOpen,
  onClose,
  campaignId,
  advertiserOrgId,
  booking,
}: BookingFormModalProps) {
  const queryClient = useQueryClient();
  const isEdit = !!booking;

  const [formData, setFormData] = useState({
    billingModel: "fixed" as BillingModel,
    rate: "",
    currency: "NGN",
    agreedImpressions: "",
    agreedAmountMinor: "",
    startDate: "",
    endDate: "",
    status: "pending" as BookingStatus,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (booking) {
      setFormData({
        billingModel: booking.billingModel,
        rate: booking.rate.toString(),
        currency: booking.currency,
        agreedImpressions: booking.agreedImpressions?.toString() || "",
        agreedAmountMinor: booking.agreedAmountMinor?.toString() || "",
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
      });
    } else {
      setFormData({
        billingModel: "fixed",
        rate: "",
        currency: "NGN",
        agreedImpressions: "",
        agreedAmountMinor: "",
        startDate: "",
        endDate: "",
        status: "pending",
      });
    }
    setErrors({});
  }, [booking, isOpen]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateBookingPayload) => createBooking(payload),
    onSuccess: async () => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["bookings", campaignId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to create booking";
      setErrors({ submit: message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBookingPayload }) =>
      updateBooking(id, payload),
    onSuccess: async () => {
      onClose();
      await queryClient.invalidateQueries({ queryKey: ["bookings", campaignId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || "Failed to update booking";
      setErrors({ submit: message });
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      newErrors.rate = "Rate must be greater than 0";
    }
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";

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

    if (isEdit && booking) {
      const payload: UpdateBookingPayload = {
        billingModel: formData.billingModel,
        rate: parseFloat(formData.rate),
        currency: formData.currency,
        agreedImpressions: formData.agreedImpressions
          ? parseInt(formData.agreedImpressions)
          : undefined,
        agreedAmountMinor: formData.agreedAmountMinor
          ? parseInt(formData.agreedAmountMinor)
          : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
      };
      updateMutation.mutate({ id: booking.id, payload });
    } else {
      const payload: CreateBookingPayload = {
        advertiserOrgId,
        campaignId,
        billingModel: formData.billingModel,
        rate: parseFloat(formData.rate),
        currency: formData.currency,
        agreedImpressions: formData.agreedImpressions
          ? parseInt(formData.agreedImpressions)
          : undefined,
        agreedAmountMinor: formData.agreedAmountMinor
          ? parseInt(formData.agreedAmountMinor)
          : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
        status: formData.status,
      };
      createMutation.mutate(payload);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-zinc-900">
            {isEdit ? "Edit Booking" : "Add Booking"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Billing Model <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.billingModel}
                onChange={(e) =>
                  setFormData({ ...formData, billingModel: e.target.value as BillingModel })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed</option>
                <option value="cpm">CPM (Cost Per Mille)</option>
                <option value="cpd">CPD (Cost Per Day)</option>
                <option value="share_of_loop">Share of Loop</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as BookingStatus })
                }
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.rate ? "border-red-500" : "border-zinc-300"
                }`}
                placeholder="0.00"
              />
              {errors.rate && <p className="text-xs text-red-600 mt-1">{errors.rate}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NGN">NGN (₦)</option>
                <option value="USD">USD ($)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Agreed Impressions
              </label>
              <input
                type="number"
                value={formData.agreedImpressions}
                onChange={(e) => setFormData({ ...formData, agreedImpressions: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">
                Agreed Amount (Minor Units)
              </label>
              <input
                type="number"
                value={formData.agreedAmountMinor}
                onChange={(e) => setFormData({ ...formData, agreedAmountMinor: e.target.value })}
                className="w-full px-3 py-2 border border-zinc-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
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
              {errors.endDate && <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : isEdit
                  ? "Update Booking"
                  : "Create Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
