"use client";

import { useState } from "react";

export default function TeamHierarchy() {
  const [members, setMembers] = useState([
    { id: 1, name: "Alice Johnson", email: "alice.j@company.com", role: "Manager", department: "Engineering", avatar: "AJ" },
    { id: 2, name: "Bob Smith", email: "bob.s@company.com", role: "Employee", department: "Engineering", avatar: "BS" },
    { id: 3, name: "Charlie Davis", email: "charlie.d@company.com", role: "Employee", department: "Marketing", avatar: "CD" },
    { id: 4, name: "Diana Prince", email: "diana.p@company.com", role: "Admin", department: "Operations", avatar: "DP" },
  ]);

  const toggleRole = (id: number) => {
    setMembers(members.map(m => {
      if (m.id === id) {
        const nextRole = m.role === "Employee" ? "Manager" : (m.role === "Manager" ? "Admin" : "Employee");
        return { ...m, role: nextRole };
      }
      return m;
    }));
  };

  return (
    <div className="max-w-6xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Team Hierarchy</h1>
          <p className="text-slate-500 mt-2">Manage roles, permissions, and organizational structure.</p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center self-start">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Invite Member
        </button>
      </div>

      {/* Stats/Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mr-4">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Employees</p>
            <p className="text-2xl font-bold text-slate-900">{members.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mr-4">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Managers</p>
            <p className="text-2xl font-bold text-slate-900">{members.filter(m => m.role === 'Manager').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mr-4">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Admins</p>
            <p className="text-2xl font-bold text-slate-900">{members.filter(m => m.role === 'Admin').length}</p>
          </div>
        </div>
      </div>

      {/* Team List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role / Access</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mr-3">
                        {member.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{member.name}</p>
                        <p className="text-sm text-slate-500">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {member.department}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button 
                      onClick={() => toggleRole(member.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer
                        ${member.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' : 
                          member.role === 'Manager' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 
                          'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}
                    >
                      {member.role}
                      <svg className="w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-slate-400 hover:text-indigo-600 font-medium text-sm transition-colors mr-3">Edit</button>
                    <button className="text-slate-400 hover:text-red-600 font-medium text-sm transition-colors">Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
