"use client";

import { useState } from "react";

export default function AdminPanelPage() {
  const [lunchStart, setLunchStart] = useState("12:00");
  const [lunchEnd, setLunchEnd] = useState("13:00");
  const [holidays, setHolidays] = useState([
    { id: 1, name: "New Year's Day", date: "2026-01-01" },
    { id: 2, name: "Independence Day", date: "2026-07-04" },
    { id: 3, name: "Company Retreat", date: "2026-08-20" }
  ]);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In a real app, send this to POST /api/admin/settings
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const addHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    setHolidays([...holidays, { id: Date.now(), name: newHolidayName, date: newHolidayDate }]);
    setNewHolidayName("");
    setNewHolidayDate("");
  };

  const removeHoliday = (id: number) => {
    setHolidays(holidays.filter(h => h.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Settings</h1>
        <p className="text-slate-500 mt-2">Manage global tenant settings, scheduling rules, and holidays.</p>
      </div>

      <div className="space-y-8">
        
        {/* Lunch Hours Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900 flex items-center">
              <svg className="w-5 h-5 mr-2 text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Default Lunch Hours
            </h2>
            <p className="text-sm text-slate-500 mt-1">These hours are protected globally when employees check the "Protect Lunch" toggle.</p>
          </div>
          <div className="p-6 flex gap-6 items-center">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Start Time</label>
              <input type="time" className="border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 p-2 border" 
                value={lunchStart} onChange={(e) => setLunchStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">End Time</label>
              <input type="time" className="border-slate-300 rounded-md shadow-sm focus:border-rust-500 focus:ring-rust-500 p-2 border" 
                value={lunchEnd} onChange={(e) => setLunchEnd(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Holidays Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center">
                <svg className="w-5 h-5 mr-2 text-rust-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Company Holidays
              </h2>
              <p className="text-sm text-slate-500 mt-1">Meeting slots will not be generated on these dates.</p>
            </div>
          </div>
          <div className="p-6">
            <form onSubmit={addHoliday} className="flex gap-4 mb-6">
              <input type="text" placeholder="Holiday Name (e.g. Thanksgiving)" className="flex-1 border-slate-300 rounded-md shadow-sm p-2 border text-sm focus:border-rust-500 focus:ring-rust-500" 
                value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} />
              <input type="date" className="border-slate-300 rounded-md shadow-sm p-2 border text-sm focus:border-rust-500 focus:ring-rust-500" 
                value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} />
              <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-slate-800 transition-colors">Add Date</button>
            </form>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Holiday Name</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {holidays.map(holiday => (
                    <tr key={holiday.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{holiday.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{holiday.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => removeHoliday(holiday.id)} className="text-red-600 hover:text-red-900">Remove</button>
                      </td>
                    </tr>
                  ))}
                  {holidays.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-sm text-slate-500">No holidays defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && <span className="text-sm font-medium text-green-600 flex items-center"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Settings saved successfully</span>}
          <button onClick={handleSave} className="bg-rust-700 text-white px-8 py-3 rounded-lg font-bold text-sm shadow-sm hover:bg-rust-800 transition-colors">
            Save Global Settings
          </button>
        </div>

      </div>
    </div>
  );
}
