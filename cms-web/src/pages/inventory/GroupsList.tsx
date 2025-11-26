import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchScreenGroups,
  createScreenGroup,
} from "../../api/screenGroups";
import type { ScreenGroup } from "../../api/screenGroups";
import { fetchOrganisations } from "../../api/organisations";
import type { Organisation } from "../../api/organisations";
import { useAuthStore } from "../../store/authStore";
import { exportToCsv } from "../../utils/csv";

export default function GroupsList() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<ScreenGroup[]>([]);
  const [publishers, setPublishers] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [publisherFilter, setPublisherFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [newGroupPublisherId, setNewGroupPublisherId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isInternal = user?.orgType === "beamer_internal";

  useEffect(() => {
    loadData();
  }, [publisherFilter, showArchived]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [groupsRes, orgsData] = await Promise.all([
        fetchScreenGroups({
          publisher_org_id: publisherFilter || undefined,
          archived: showArchived,
        }),
        isInternal ? fetchOrganisations() : Promise.resolve([]),
      ]);

      setGroups(groupsRes.items);
      if (isInternal) {
        const publisherOrgs = orgsData.filter((org) => org.type === "publisher");
        setPublishers(publisherOrgs);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = groups.filter((g) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.publisherName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function handleRowClick(groupId: string) {
    navigate(`/inventory/groups/${groupId}`);
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim()) {
      setCreateError("Name is required");
      return;
    }

    const targetPublisherId = isInternal ? newGroupPublisherId : user?.orgId;
    if (!targetPublisherId) {
      setCreateError("Publisher is required");
      return;
    }

    try {
      setCreateLoading(true);
      setCreateError(null);

      const created = await createScreenGroup({
        publisher_org_id: targetPublisherId,
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });

      setShowCreateModal(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setNewGroupPublisherId("");

      navigate(`/inventory/groups/${created.id}`);
    } catch (err: any) {
      setCreateError(err.response?.data?.error || err.message || "Failed to create group");
    } finally {
      setCreateLoading(false);
    }
  }

  function handleExportCsv() {
    const data = filteredGroups.map((g) => ({
      id: g.id,
      name: g.name,
      publisher: g.publisherName,
      screen_count: g.screenCount,
      status: g.isArchived ? "Archived" : "Active",
      updated_at: new Date(g.updatedAt).toISOString(),
    }));
    exportToCsv(data, "screen_groups");
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-600">Loading groups...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Screen Groups</h1>
          <p className="text-zinc-500 mt-1">
            Organize screens into groups for easier targeting and management
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            New Group
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="p-4 border-b border-zinc-200 flex flex-wrap gap-4">
          {isInternal && (
            <select
              value={publisherFilter}
              onChange={(e) => setPublisherFilter(e.target.value)}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Publishers</option>
              {publishers.map((pub) => (
                <option key={pub.id} value={pub.id}>
                  {pub.name}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />

          <label className="flex items-center gap-2 text-sm text-zinc-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-zinc-300"
            />
            Show Archived
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Name
                </th>
                {isInternal && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                    Publisher
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                  Screens
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td
                    colSpan={isInternal ? 5 : 4}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    {searchQuery
                      ? "No groups match your search"
                      : "No screen groups found. Create one to get started."}
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group) => (
                  <tr
                    key={group.id}
                    onClick={() => handleRowClick(group.id)}
                    className="hover:bg-zinc-50 cursor-pointer transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-900">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-zinc-500 truncate max-w-xs">
                          {group.description}
                        </div>
                      )}
                    </td>
                    {isInternal && (
                      <td className="px-4 py-3 text-zinc-600">{group.publisherName}</td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                        {group.screenCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          group.isArchived
                            ? "bg-zinc-100 text-zinc-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {group.isArchived ? "Archived" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      {formatDate(group.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-zinc-900">
                Create Screen Group
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Lagos CBD Screens"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Optional description for this group"
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {isInternal && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">
                    Publisher *
                  </label>
                  <select
                    value={newGroupPublisherId}
                    onChange={(e) => setNewGroupPublisherId(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select publisher</option>
                    {publishers.map((pub) => (
                      <option key={pub.id} value={pub.id}>
                        {pub.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateError(null);
                }}
                disabled={createLoading}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={createLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {createLoading ? "Creating..." : "Create Group"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
