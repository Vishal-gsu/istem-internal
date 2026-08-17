"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertCircle, Calendar, CheckSquare, Bug } from "lucide-react";

export default function AdminPanelPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"meetings" | "tasks" | "issues">("meetings");
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState("");

  // 1. Verify Admin Access
  useEffect(() => {
    fetch("/sync/api/admin/check", { credentials: "include" })
      .then((res) => {
        if (!res.ok) {
          router.push("/dashboard");
          throw new Error("Not authorized");
        }
        return res.json();
      })
      .then(() => setIsAdmin(true))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // 2. Fetch Data based on active tab
  const fetchData = () => {
    if (!isAdmin) return;
    setLoading(true);
    fetch(`/sync/api/admin/${activeTab}`, { credentials: "include" })
      .then((res) => res.json())
      .then((resData) => {
        if (Array.isArray(resData)) {
          setData(resData);
        } else {
          setData([]);
        }
      })
      .catch((err) => setError("Failed to fetch data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [activeTab, isAdmin]);

  // 3. Delete Record
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to permanently delete this record?")) return;
    
    try {
      const res = await fetch(`/sync/api/admin/${activeTab}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        fetchData(); // Refresh table
      } else {
        alert("Failed to delete record.");
      }
    } catch (e) {
      alert("Error occurred while deleting.");
    }
  };

  if (loading && !isAdmin) {
    return <div className="p-10 text-center text-muted-foreground">Verifying access...</div>;
  }

  if (!isAdmin) return null; // Will redirect

  return (
    <div className="mx-auto max-w-6xl pb-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight text-foreground flex items-center gap-2">
          <AlertCircle className="text-destructive" /> Security Dashboard (Admin)
        </h1>
        <p className="mt-2 text-muted-foreground">
          You have high-level access to delete system records. Please proceed with caution.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-border pb-4">
        <button
          onClick={() => setActiveTab("meetings")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === "meetings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Calendar size={18} /> Meetings
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === "tasks" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <CheckSquare size={18} /> Tasks
        </button>
        <button
          onClick={() => setActiveTab("issues")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
            activeTab === "issues" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
          }`}
        >
          <Bug size={18} /> Issues
        </button>
      </div>

      {/* Data Table */}
      <div className="neu-glass rounded-2xl overflow-hidden border border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/50 text-muted-foreground font-semibold text-xs uppercase">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Title / Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">Loading...</td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">No records found.</td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4 font-mono text-muted-foreground">#{item.id}</td>
                    <td className="px-6 py-4 font-semibold text-foreground">{item.title || item.name || "Untitled"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary rounded text-xs font-medium uppercase">
                        {item.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors inline-flex items-center gap-2"
                        title="Delete Permanently"
                      >
                        <Trash2 size={16} /> <span className="hidden sm:inline text-xs font-bold">Delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
