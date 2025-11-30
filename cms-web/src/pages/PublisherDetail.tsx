import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { fetchPublisherById, deletePublisher, type PublisherProfileDetail } from "../api/publishers";
import { fetchScreens, updateScreen, type Screen } from "../api/screens";
import { useAuthStore } from "../store/authStore";
import PublisherFormModal from "../components/PublisherFormModal";
import { PublisherVehiclesTab } from "../components/publishers/PublisherVehiclesTab";

type TabType = "overview" | "screens" | "vehicles" | "reports";

export default function PublisherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuthStore();
  
  const initialTab = (searchParams.get("tab") as TabType) || "overview";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  
  const [publisher, setPublisher] = useState<PublisherProfileDetail | null>(null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [availableScreens, setAvailableScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  async function loadPublisher() {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await fetchPublisherById(id);
      setPublisher(data);
    } catch (err: any) {
      console.error("Failed to fetch publisher:", err);
      setError(
        err.response?.data?.error || "Failed to load publisher details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadScreens() {
    if (!id) return;

    try {
      const allScreens = await fetchScreens({});
      const publisherScreens = allScreens.filter((s) => s.publisher?.id === id);
      setScreens(publisherScreens);
      
      const available = allScreens.filter((s) => !s.publisher || s.publisher.id === id);
      setAvailableScreens(available);
    } catch (err: any) {
      console.error("Failed to fetch screens:", err);
    }
  }

  useEffect(() => {
    loadPublisher();
    loadScreens();
  }, [id]);

  async function handleAssignScreens() {
    if (selectedScreenIds.length === 0 || !publisher) return;

    try {
      await Promise.all(
        selectedScreenIds.map((screenId) =>
          updateScreen(screenId, { 
            publisherId: id!
          })
        )
      );
      
      setIsAssignModalOpen(false);
      setSelectedScreenIds([]);
      await loadScreens();
      await loadPublisher();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to assign screens");
    }
  }

  async function handleRemoveScreen(screenId: string) {
    if (!confirm("Are you sure you want to remove this screen from this publisher?")) return;

    try {
      await updateScreen(screenId, { 
        publisherId: null
      });
      await loadScreens();
      await loadPublisher();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to remove screen");
    }
  }

  async function handleDelete() {
    if (!id || !confirm("Are you sure you want to delete this publisher?")) return;

    try {
      await deletePublisher(id);
      navigate("/publishers");
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete publisher");
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-600">Loading publisher details...</div>
      </div>
    );
  }

  if (error || !publisher) {
    return (
      <div>
        <button
          onClick={() => navigate("/publishers")}
          className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
        >
          ← Back to Publishers
        </button>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{error || "Publisher not found"}</p>
        </div>
      </div>
    );
  }

  const canEdit = user?.orgType === "beamer_internal" && (user?.role === "admin" || user?.role === "ops");

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "screens", label: "Screens", count: publisher.screenCount },
    { id: "vehicles", label: "Vehicles", count: publisher.vehicleCount },
    { id: "reports", label: "Reports" },
  ];

  return (
    <div>
      <button
        onClick={() => navigate("/publishers")}
        className="mb-4 text-sm text-cyan-600 hover:text-cyan-700 font-medium"
      >
        ← Back to Publishers
      </button>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-sm font-mono font-semibold bg-zinc-100 text-zinc-700">
              {publisher.publicCode}
            </span>
            <h1 className="text-2xl font-semibold text-zinc-900">
              {publisher.publisherType === "organisation"
                ? publisher.organisationName || "Organisation Publisher"
                : publisher.fullName || "Individual Publisher"}
            </h1>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              publisher.publisherType === "organisation"
                ? "bg-purple-100 text-purple-700"
                : "bg-blue-100 text-blue-700"
            }`}>
              {publisher.publisherType === "organisation" ? "Organisation" : "Individual"}
            </span>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50 transition-colors text-sm font-medium"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors text-sm font-medium"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-zinc-200 overflow-hidden">
        <div className="border-b border-zinc-200">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-cyan-600 text-cyan-600"
                    : "border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs font-medium rounded-full bg-zinc-100 text-zinc-600">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Type</p>
                <p className="mt-1 text-sm text-zinc-900">
                  {publisher.publisherType === "organisation" ? "Organisation" : "Individual"}
                </p>
              </div>
              {publisher.organisationName && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Organisation</p>
                  <p className="mt-1 text-sm text-zinc-900">{publisher.organisationName}</p>
                </div>
              )}
              {publisher.fullName && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Full Name</p>
                  <p className="mt-1 text-sm text-zinc-900">{publisher.fullName}</p>
                </div>
              )}
              {publisher.phoneNumber && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Phone</p>
                  <p className="mt-1 text-sm text-zinc-900">{publisher.phoneNumber}</p>
                </div>
              )}
              {publisher.email && (
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Email</p>
                  <p className="mt-1 text-sm text-zinc-900">{publisher.email}</p>
                </div>
              )}
              {publisher.address && (
                <div className="col-span-2">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Address</p>
                  <p className="mt-1 text-sm text-zinc-900">{publisher.address}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Screens</p>
                <p className="mt-1 text-sm text-zinc-900">{publisher.screenCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Vehicles</p>
                <p className="mt-1 text-sm text-zinc-900">{publisher.vehicleCount}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Created At</p>
                <p className="mt-1 text-sm text-zinc-900">{formatDate(publisher.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Updated At</p>
                <p className="mt-1 text-sm text-zinc-900">{formatDate(publisher.updatedAt)}</p>
              </div>
            </div>
            
            {publisher.notes && (
              <div className="border-t border-zinc-200">
                <div className="px-6 py-4">
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{publisher.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "screens" && (
          <div>
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-900">Screens ({screens.length})</h2>
              {canEdit && availableScreens.length > screens.length && (
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-3 py-1.5 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors text-sm font-medium"
                >
                  + Assign Screens
                </button>
              )}
            </div>
            {screens.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-zinc-500">
                No screens assigned to this publisher.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      City
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Region
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Status
                    </th>
                    {canEdit && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-zinc-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-zinc-200">
                  {screens.map((screen) => (
                    <tr key={screen.id} className="hover:bg-zinc-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/screens/${screen.id}`)}
                          className="text-sm font-semibold text-cyan-600 hover:text-cyan-700"
                        >
                          {screen.code}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {screen.name || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {screen.city}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                        {screen.region}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${
                            screen.status === "active"
                              ? "bg-green-100 text-green-800"
                              : screen.status === "inactive"
                              ? "bg-gray-100 text-gray-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {screen.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => handleRemoveScreen(screen.id)}
                            className="text-red-600 hover:text-red-700 font-medium"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "vehicles" && (
          <PublisherVehiclesTab publisherOrgId={publisher.organisationId} />
        )}

        {activeTab === "reports" && (
          <div className="px-6 py-8">
            <h2 className="text-lg font-semibold text-zinc-900 mb-4">Publisher Reports</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => navigate(`/reporting?publisher=${publisher.organisationId || id}`)}
                className="p-4 text-left border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <h3 className="font-medium text-zinc-900">Campaign Performance</h3>
                <p className="text-sm text-zinc-600 mt-1">
                  View impressions, plays, and campaign metrics for screens owned by this publisher.
                </p>
              </button>
              {publisher.publisherType === "organisation" && (
                <button
                  onClick={() => navigate(`/reports/vehicles?publisher=${publisher.organisationId}`)}
                  className="p-4 text-left border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
                >
                  <h3 className="font-medium text-zinc-900">Vehicle Performance</h3>
                  <p className="text-sm text-zinc-600 mt-1">
                    View performance metrics for vehicles and their attached screens.
                  </p>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {isAssignModalOpen && (
        <div
          className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setIsAssignModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-zinc-900">Assign Screens</h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-zinc-600 mb-4">
              Select screens to assign to this publisher. Only screens without a publisher assignment are shown.
            </p>
            <div className="space-y-2 mb-6 max-h-96 overflow-y-auto">
              {availableScreens.filter(s => !s.publisher).map((screen) => (
                <label
                  key={screen.id}
                  className="flex items-center p-3 border border-zinc-200 rounded-md hover:bg-zinc-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedScreenIds.includes(screen.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedScreenIds([...selectedScreenIds, screen.id]);
                      } else {
                        setSelectedScreenIds(selectedScreenIds.filter((sid) => sid !== screen.id));
                      }
                    }}
                    className="mr-3 h-4 w-4 text-cyan-600 focus:ring-cyan-500 border-zinc-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-900">
                      {screen.code} {screen.name && `• ${screen.name}`}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {screen.city}, {screen.region}
                    </div>
                  </div>
                </label>
              ))}
              {availableScreens.filter(s => !s.publisher).length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-8">
                  No unassigned screens available.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 border border-zinc-300 text-zinc-700 rounded-md hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignScreens}
                disabled={selectedScreenIds.length === 0}
                className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign {selectedScreenIds.length > 0 && `(${selectedScreenIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <PublisherFormModal
          mode="edit"
          publisherId={publisher.id}
          publisher={publisher}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            loadPublisher();
          }}
        />
      )}
    </div>
  );
}
