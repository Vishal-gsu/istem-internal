"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../../components/AuthProvider";

interface OrgMember {
  id: string;
  displayName: string;
  mail: string;
  jobTitle: string;
}

export default function MembersPage() {
  const { user: account } = useAuth();
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        if (!account) return;

        // Call our FastAPI backend (proxy uses credentials automatically if same-site, but include ensures it)
        const apiResponse = await fetch("/api/org-members", {
          credentials: "include"
        });

        if (!apiResponse.ok) {
          throw new Error("Failed to fetch members from backend");
        }

        const data = await apiResponse.json();
        setMembers(data);
      } catch (err: any) {
        console.error("Error fetching members:", err);
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [account]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rust-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-red-500">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <p className="font-semibold text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-screen-xl mx-auto pb-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Organization Members</h1>
        <p className="text-slate-500 mt-2">View all members across your testing tenants.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Name
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Email
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Job Title
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Graph ID
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  No members found in this tenant.
                </td>
              </tr>
            )}
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-rust-100 flex items-center justify-center text-rust-700 font-bold">
                      {member.displayName.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900">{member.displayName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-500">{member.mail || member.userPrincipalName || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-slate-500">{member.jobTitle || 'N/A'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                  {member.id.substring(0, 8)}...
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
