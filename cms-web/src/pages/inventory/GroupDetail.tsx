import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  fetchScreenGroup,
  fetchGroupMembers,
  fetchGroupFlights,
  fetchGroupHealth,
  updateScreenGroup,
  deleteScreenGroup,
  addGroupMembers,
  removeGroupMembers,
  uploadGroupMembersCsv,
} from "../../api/screenGroups";
import type {
  ScreenGroupDetail,
  GroupMember,
  GroupFlight,
  GroupHealth,
} from "../../api/screenGroups";
import { fetchScreens } from "../../api/screens";
import type { Screen } from "../../api/screens";
import { useAuthStore } from "../../store/authStore";
import { exportToCsv } from "../../utils/csv";

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [group, setGroup] = useState<ScreenGroupDetail | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [flights, setFlights] = useState<GroupFlight[]>([]);
  const [health, setHealth] = useState<GroupHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"members" | "health" | "flights">("members");
  const [memberPage, setMemberPage] = useState(1);
  const [memberTotal, setMemberTotal] = useState(0);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showAddScreensModal, setShowAddScreensModal] = useState(false);
  const [availableScreens, setAvailableScreens] = useState<Screen[]>([]);
  const [screenSearch, setScreenSearch] = useState("");
  const [screensToAdd, setScreensToAdd] = useState<Set<string>>(new Set());
  const [addingScreens, setAddingScreens] = useState(false);

  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvData, setCsvData] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [csvResult, setCsvResult] = useState<{ added: number; skipped: number; not_found: number } | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isInternal = user?.orgType === "beamer_internal";
  const canEdit = isInternal || user?.role === "admin" || user?.role === "ops";

  useEffect(() => {
    if (id) {
      loadGroupData();
    }
  }, [id]);

  useEffect(() => {
    if (id && activeTab === "members") {
      loadMembers();
    }
  }, [id, activeTab, memberPage, memberSearch]);

  useEffect(() => {
    if (id && activeTab === "flights" && flights.length === 0) {
      loadFlights();
    }
  }, [id, activeTab]);

  useEffect(() => {
    if (id && activeTab === "health" && !health) {
      loadHealth();
    }
  }, [id, activeTab]);

  async function loadGroupData() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchScreenGroup(id!);
      setGroup(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to load group");
    } finally {
      setLoading(false);
    }
  }

  async function loadMembers() {
    if (!id) return;
    try {
      const res = await fetchGroupMembers(id, {
        q: memberSearch || undefined,
        page: memberPage,
        page_size: 50,
      });
      setMembers(res.data);
      setMemberTotal(res.pagination.total);
    } catch (err: any) {
      console.error("Failed to load members:", err);
    }
  }

  async function loadFlights() {
    if (!id) return;
    try {
      const data = await fetchGroupFlights(id);
      setFlights(data);
    } catch (err: any) {
      console.error("Failed to load flights:", err);
    }
  }

  async function loadHealth() {
    if (!id) return;
    try {
      const data = await fetchGroupHealth(id);
      setHealth(data);
    } catch (err: any) {
      console.error("Failed to load health:", err);
    }
  }

  async function loadAvailableScreens() {
    try {
      const screens = await fetchScreens({ publisherOrgId: group?.orgId });
      setAvailableScreens(screens);
    } catch (err: any) {
      console.error("Failed to load screens:", err);
    }
  }

  async function handleSaveGroup() {
    if (!id || !editName.trim()) return;

    try {
      setSaveLoading(true);
      setSaveError(null);
      await updateScreenGroup(id, {
        name: editName.trim(),
        description: editDescription.trim() || null,
      });
      setShowRenameModal(false);
      loadGroupData();
    } catch (err: any) {
      setSaveError(err.response?.data?.error || err.message || "Failed to save");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleToggleArchive() {
    if (!id || !group) return;

    try {
      await updateScreenGroup(id, { is_archived: !group.isArchived });
      loadGroupData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to update");
    }
  }

  async function handleDelete(force: boolean) {
    if (!id) return;

    try {
      setDeleteLoading(true);
      await deleteScreenGroup(id, force);
      navigate("/inventory/groups");
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to delete");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleAddScreens() {
    if (!id || screensToAdd.size === 0) return;

    try {
      setAddingScreens(true);
      await addGroupMembers(id, Array.from(screensToAdd));
      setShowAddScreensModal(false);
      setScreensToAdd(new Set());
      loadMembers();
      loadGroupData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to add screens");
    } finally {
      setAddingScreens(false);
    }
  }

  async function handleRemoveSelected() {
    if (!id || selectedMembers.size === 0) return;

    if (!confirm(`Remove ${selectedMembers.size} screen(s) from this group?`)) return;

    try {
      await removeGroupMembers(id, Array.from(selectedMembers));
      setSelectedMembers(new Set());
      loadMembers();
      loadGroupData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to remove screens");
    }
  }

  async function handleCsvUpload() {
    if (!id || !csvData.trim()) return;

    try {
      setCsvLoading(true);
      const result = await uploadGroupMembersCsv(id, csvData);
      setCsvResult(result);
      loadMembers();
      loadGroupData();
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Failed to upload CSV");
    } finally {
      setCsvLoading(false);
    }
  }

  function handleExportMembers() {
    const data = members.map((m) => ({
      screen_id: m.screenId,
      screen_code: m.screenCode,
      screen_name: m.screenName || "",
      city: m.city,
      region: m.regionCode,
      status: m.status,
      resolution: `${m.resolutionWidth}x${m.resolutionHeight}`,
      is_online: m.isOnline ? "Yes" : "No",
      added_at: new Date(m.addedAt).toISOString(),
    }));
    exportToCsv(data, `group_${group?.name || id}_members`);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const filteredAvailableScreens = availableScreens.filter((s) => {
    const memberIds = new Set(members.map((m) => m.screenId));
    if (memberIds.has(s.id)) return false;
    if (!screenSearch) return true;
    const q = screenSearch.toLowerCase();
    return (
      s.code.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-zinc-600">Loading group...</div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error || "Group not found"}
        </div>
        <button
          onClick={() => navigate("/inventory/groups")}
          className="mt-4 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg hover:bg-zinc-200"
        >
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          to="/inventory/groups"
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          &larr; Back to Groups
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 flex items-center gap-3">
              {group.name}
              {group.isArchived && (
                <span className="text-sm px-2 py-1 bg-zinc-100 text-zinc-600 rounded">
                  Archived
                </span>
              )}
            </h1>
            {group.description && (
              <p className="text-zinc-500 mt-1">{group.description}</p>
            )}
            <p className="text-sm text-zinc-400 mt-2">
              {group.orgName} &bull; {group.screenCount} screens &bull; Updated{" "}
              {formatDate(group.updatedAt)}
            </p>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditName(group.name);
                  setEditDescription(group.description || "");
                  setShowRenameModal(true);
                }}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50"
              >
                Edit
              </button>
              <button
                onClick={handleToggleArchive}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50"
              >
                {group.isArchived ? "Unarchive" : "Archive"}
              </button>
              {isInternal && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-lg">
        <div className="border-b border-zinc-200">
          <nav className="flex">
            {(["members", "health", "flights"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {tab === "members"
                  ? `Members (${group.screenCount})`
                  : tab === "health"
                  ? "Health"
                  : `Flights (${flights.length})`}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "members" && (
          <div>
            <div className="p-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setMemberPage(1);
                  }}
                  className="px-3 py-2 border border-zinc-200 rounded-lg text-sm w-64"
                />
                <button
                  onClick={handleExportMembers}
                  className="px-3 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-sm"
                >
                  Export CSV
                </button>
              </div>

              {canEdit && (
                <div className="flex gap-2">
                  {selectedMembers.size > 0 && (
                    <button
                      onClick={handleRemoveSelected}
                      className="px-3 py-2 bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 text-sm"
                    >
                      Remove ({selectedMembers.size})
                    </button>
                  )}
                  <button
                    onClick={() => setShowCsvModal(true)}
                    className="px-3 py-2 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-sm"
                  >
                    Upload CSV
                  </button>
                  <button
                    onClick={() => {
                      loadAvailableScreens();
                      setShowAddScreensModal(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                  >
                    Add Screens
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-50">
                  <tr>
                    {canEdit && (
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={
                            members.length > 0 &&
                            selectedMembers.size === members.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers(
                                new Set(members.map((m) => m.screenId))
                              );
                            } else {
                              setSelectedMembers(new Set());
                            }
                          }}
                          className="rounded border-zinc-300"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Screen
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Location
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                      Resolution
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">
                      Added
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-zinc-500 uppercase">
                      Groups
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {members.length === 0 ? (
                    <tr>
                      <td
                        colSpan={canEdit ? 7 : 6}
                        className="px-4 py-8 text-center text-zinc-500"
                      >
                        No screens in this group yet
                      </td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.screenId} className="hover:bg-zinc-50">
                        {canEdit && (
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedMembers.has(member.screenId)}
                              onChange={(e) => {
                                const newSet = new Set(selectedMembers);
                                if (e.target.checked) {
                                  newSet.add(member.screenId);
                                } else {
                                  newSet.delete(member.screenId);
                                }
                                setSelectedMembers(newSet);
                              }}
                              className="rounded border-zinc-300"
                            />
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <Link
                            to={`/screens/${member.screenId}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {member.screenCode}
                          </Link>
                          {member.screenName && (
                            <div className="text-sm text-zinc-500">
                              {member.screenName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-zinc-600">
                          {member.city}, {member.regionCode}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              member.isOnline
                                ? "bg-green-100 text-green-700"
                                : "bg-zinc-100 text-zinc-600"
                            }`}
                          >
                            {member.isOnline ? "Online" : "Offline"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-zinc-600">
                          {member.resolutionWidth}x{member.resolutionHeight}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-500">
                          {formatDate(member.addedAt)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {member.groupCount > 1 && (
                            <span
                              className="text-xs text-zinc-500 cursor-help"
                              title="This screen is in multiple groups"
                            >
                              {member.groupCount}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {memberTotal > 50 && (
              <div className="p-4 border-t border-zinc-200 flex items-center justify-between">
                <span className="text-sm text-zinc-500">
                  Showing {(memberPage - 1) * 50 + 1}-
                  {Math.min(memberPage * 50, memberTotal)} of {memberTotal}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMemberPage((p) => Math.max(1, p - 1))}
                    disabled={memberPage === 1}
                    className="px-3 py-1 border border-zinc-200 rounded text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setMemberPage((p) => p + 1)}
                    disabled={memberPage * 50 >= memberTotal}
                    className="px-3 py-1 border border-zinc-200 rounded text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "health" && (
          <div className="p-6">
            {health ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-500 mb-3">
                    Screen Status
                  </h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {health.onlineCount}
                      </div>
                      <div className="text-sm text-zinc-500">Online</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-zinc-400">
                        {health.offlineCount}
                      </div>
                      <div className="text-sm text-zinc-500">Offline</div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-500 mb-3">
                    By Region
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(health.regionBreakdown).map(
                      ([region, count]) => (
                        <div
                          key={region}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-zinc-600">{region}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    )}
                    {Object.keys(health.regionBreakdown).length > 1 && (
                      <div className="pt-2 mt-2 border-t border-zinc-200 text-xs text-amber-600">
                        Mixed regions in group
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-zinc-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-500 mb-3">
                    By Resolution
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(health.resolutionBreakdown).map(
                      ([res, count]) => (
                        <div
                          key={res}
                          className="flex justify-between text-sm"
                        >
                          <span className="text-zinc-600">{res}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    )}
                    {Object.keys(health.resolutionBreakdown).length > 1 && (
                      <div className="pt-2 mt-2 border-t border-zinc-200 text-xs text-amber-600">
                        Mixed resolutions may affect creative display
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-500">Loading health data...</div>
            )}
          </div>
        )}

        {activeTab === "flights" && (
          <div className="p-6">
            {flights.length === 0 ? (
              <div className="text-center text-zinc-500 py-8">
                No flights are targeting this group
              </div>
            ) : (
              <div className="space-y-4">
                {flights.map((flight) => (
                  <div
                    key={flight.flightId}
                    className="border border-zinc-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <Link
                          to={`/flights/${flight.flightId}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {flight.flightName}
                        </Link>
                        <div className="text-sm text-zinc-500">
                          <Link
                            to={`/campaigns/${flight.campaignId}`}
                            className="hover:underline"
                          >
                            {flight.campaignName}
                          </Link>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          flight.status === "active"
                            ? "bg-green-100 text-green-700"
                            : flight.status === "scheduled"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {flight.status}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-500 mt-2">
                      {formatDateTime(flight.startDatetime)} &rarr;{" "}
                      {formatDateTime(flight.endDatetime)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showRenameModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold">Edit Group</h2>
            </div>
            <div className="p-6 space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {saveError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={100}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => setShowRenameModal(false)}
                disabled={saveLoading}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveGroup}
                disabled={saveLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                {saveLoading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddScreensModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold">Add Screens to Group</h2>
            </div>
            <div className="p-4 border-b border-zinc-200">
              <input
                type="text"
                placeholder="Search screens..."
                value={screenSearch}
                onChange={(e) => setScreenSearch(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {filteredAvailableScreens.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  No available screens to add
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAvailableScreens.map((screen) => (
                    <label
                      key={screen.id}
                      className="flex items-center gap-3 p-3 border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={screensToAdd.has(screen.id)}
                        onChange={(e) => {
                          const newSet = new Set(screensToAdd);
                          if (e.target.checked) {
                            newSet.add(screen.id);
                          } else {
                            newSet.delete(screen.id);
                          }
                          setScreensToAdd(newSet);
                        }}
                        className="rounded border-zinc-300"
                      />
                      <div>
                        <div className="font-medium">{screen.code}</div>
                        <div className="text-sm text-zinc-500">
                          {screen.name && `${screen.name} - `}
                          {screen.city}, {screen.region}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-between">
              <span className="text-sm text-zinc-500">
                {screensToAdd.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddScreensModal(false);
                    setScreensToAdd(new Set());
                  }}
                  disabled={addingScreens}
                  className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddScreens}
                  disabled={addingScreens || screensToAdd.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {addingScreens ? "Adding..." : "Add Selected"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCsvModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold">Upload CSV</h2>
            </div>
            <div className="p-6 space-y-4">
              {csvResult ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="font-medium text-green-800 mb-2">
                    Upload Complete
                  </div>
                  <div className="text-sm text-green-700">
                    <div>{csvResult.added} screen(s) added</div>
                    <div>{csvResult.skipped} already in group</div>
                    <div>{csvResult.not_found} not found</div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-600">
                    Paste CSV data with a header row. Use column name:
                    screen_id, screen_name, code, or name.
                  </p>
                  <textarea
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="screen_id&#10;abc123&#10;def456"
                    rows={8}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-lg font-mono text-sm"
                  />
                </>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCsvModal(false);
                  setCsvData("");
                  setCsvResult(null);
                }}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg"
              >
                {csvResult ? "Close" : "Cancel"}
              </button>
              {!csvResult && (
                <button
                  onClick={handleCsvUpload}
                  disabled={csvLoading || !csvData.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                >
                  {csvLoading ? "Uploading..." : "Upload"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-zinc-200">
              <h2 className="text-lg font-semibold text-red-600">
                Delete Group
              </h2>
            </div>
            <div className="p-6">
              <p className="text-zinc-600">
                Are you sure you want to permanently delete "{group.name}"? This
                action cannot be undone.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(true)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
              >
                {deleteLoading ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
