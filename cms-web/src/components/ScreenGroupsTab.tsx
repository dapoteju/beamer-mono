import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchScreenGroups, type ScreenGroupMembership } from "../api/screens";
import { fetchScreenGroups as fetchAllGroups, addGroupMembers, removeGroupMembers, type ScreenGroup } from "../api/screenGroups";
import { useAuthStore } from "../store/authStore";

interface ScreenGroupsTabProps {
  screenId: string;
  publisherOrgId: string;
}

export function ScreenGroupsTab({ screenId, publisherOrgId }: ScreenGroupsTabProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ScreenGroupMembership[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<ScreenGroup[]>([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [removingFromGroup, setRemovingFromGroup] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const canModify = user?.orgType === "beamer_internal" || 
    (user?.orgId === publisherOrgId && (user?.role === "admin" || user?.role === "ops"));

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScreenGroups(screenId);
      setGroups(data.groups);
    } catch (err: any) {
      console.error("Failed to fetch screen groups:", err);
      setError(err.response?.data?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableGroups() {
    try {
      setLoadingAvailable(true);
      const data = await fetchAllGroups({ publisher_org_id: publisherOrgId, archived: false });
      const existingGroupIds = new Set(groups.map(g => g.id));
      setAvailableGroups(data.items.filter(g => !existingGroupIds.has(g.id)));
    } catch (err: any) {
      console.error("Failed to fetch available groups:", err);
    } finally {
      setLoadingAvailable(false);
    }
  }

  useEffect(() => {
    loadGroups();
  }, [screenId]);

  useEffect(() => {
    if (showAddModal) {
      loadAvailableGroups();
    }
  }, [showAddModal, groups]);

  async function handleAddToGroup() {
    if (!selectedGroupId) return;

    try {
      setAddingToGroup(true);
      await addGroupMembers(selectedGroupId, [screenId]);
      setToast({ type: "success", message: "Screen added to group" });
      setShowAddModal(false);
      setSelectedGroupId("");
      await loadGroups();
    } catch (err: any) {
      console.error("Failed to add screen to group:", err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to add to group" });
    } finally {
      setAddingToGroup(false);
    }
  }

  async function handleRemoveFromGroup(groupId: string, groupName: string) {
    if (!confirm(`Remove this screen from "${groupName}"?`)) return;

    try {
      setRemovingFromGroup(groupId);
      await removeGroupMembers(groupId, [screenId]);
      setToast({ type: "success", message: `Removed from "${groupName}"` });
      await loadGroups();
    } catch (err: any) {
      console.error("Failed to remove screen from group:", err);
      setToast({ type: "error", message: err.response?.data?.error || "Failed to remove from group" });
    } finally {
      setRemovingFromGroup(null);
    }
  }

  function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-zinc-600">Loading groups...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Group Memberships
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            In {groups.length} group{groups.length !== 1 ? "s" : ""}
          </span>
        </div>
        {canModify && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add to group...
          </button>
        )}
      </div>

      {groups.length === 0 ? (
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-6 text-center">
          <p className="text-sm text-zinc-500">This screen is not in any groups yet.</p>
          {canModify && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700"
            >
              Add to a group
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Group Name</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Screens</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Added</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-700">Status</th>
                {canModify && (
                  <th className="px-4 py-3 text-right font-medium text-zinc-700">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {groups.map((group) => (
                <tr key={group.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <Link
                      to={`/inventory/groups/${group.id}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {group.name}
                    </Link>
                    {group.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs">
                        {group.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {group.screenCount} screen{group.screenCount !== 1 ? "s" : ""}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {formatDateTime(group.addedAt)}
                    {group.addedByUserName && (
                      <span className="block text-zinc-400">by {group.addedByUserName}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {group.isArchived ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-600">
                        Archived
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    )}
                  </td>
                  {canModify && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleRemoveFromGroup(group.id, group.name)}
                        disabled={removingFromGroup === group.id}
                        className="text-red-600 hover:text-red-700 text-xs disabled:opacity-50"
                      >
                        {removingFromGroup === group.id ? "Removing..." : "Remove"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h3 className="text-lg font-semibold text-zinc-900">Add to Group</h3>
            </div>
            <div className="px-6 py-4">
              {loadingAvailable ? (
                <div className="text-center py-4 text-zinc-500">Loading groups...</div>
              ) : availableGroups.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-zinc-500 text-sm">No available groups to add this screen to.</p>
                  <Link
                    to="/inventory/groups"
                    className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
                  >
                    Create a new group
                  </Link>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Select a group
                  </label>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a group...</option>
                    {availableGroups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.screenCount} screens)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedGroupId("");
                }}
                className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToGroup}
                disabled={!selectedGroupId || addingToGroup}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingToGroup ? "Adding..." : "Add to Group"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
