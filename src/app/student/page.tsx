"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

interface Teacher {
  id: string;
  name: string;
  bio: string | null;
  photo: string | null;
  email: string | null;
  phone: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  _count: { members: number };
}

interface EnrollmentRequest {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
  message: string | null;
  teacherReply: string | null;
  group: { id: string; name: string; description: string | null; schedule: string | null };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [requestLoading, setRequestLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [teacherRes, groupsRes, reqRes] = await Promise.all([
        fetch("/api/teacher/public"),
        fetch("/api/groups"),
        fetch("/api/enrollment/my"),
      ]);
      const teacherData = await teacherRes.json();
      const groupsData = await groupsRes.json();
      const reqData = await reqRes.json();

      setTeacher(teacherData.teacher);
      setGroups(groupsData.groups || []);
      setRequests(reqData.requests || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendRequest(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedGroupId) {
      setMsg("❌ Zəhmət olmasa qrup seçin");
      return;
    }
    setRequestLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/enrollment/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("✅ Müraciət göndərildi!");
      setShowRequestForm(false);
      setSelectedGroupId("");
      setMessage("");
      await fetchData();
    } catch (err: unknown) {
      setMsg("❌ " + (err instanceof Error ? err.message : "Xəta baş verdi"));
    } finally {
      setRequestLoading(false);
    }
  }

  const hasAcceptedRequest = requests.some(r => r.status === "ACCEPTED");

  const statusConfig = {
    PENDING: { label: "Gözlənilir", color: "bg-yellow-100 text-yellow-700", icon: "⏳" },
    ACCEPTED: { label: "Qəbul edildi", color: "bg-green-100 text-green-700", icon: "✅" },
    DECLINED: { label: "Rədd edildi", color: "bg-red-100 text-red-700", icon: "❌" },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Xoş gəldiniz, {user?.name} 👋</h1>
        <p className="text-gray-500 mt-1">EduFlow tələbə panelinizə xoş gəldiniz.</p>
      </div>

      {teacher ? (
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Müəllim</h2>
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden flex-shrink-0 border-2 border-blue-200">
              {teacher.photo ? (
                <img src={teacher.photo} alt={teacher.name} className="w-full h-full object-cover" />
              ) : teacher.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{teacher.name}</h3>
              {teacher.bio && <p className="text-gray-600 text-sm mt-2">{teacher.bio}</p>}
              <div className="flex flex-wrap gap-3 mt-3">
                {teacher.phone && <span className="text-sm text-gray-500">📱 {teacher.phone}</span>}
                {teacher.email && <span className="text-sm text-gray-500">✉️ {teacher.email}</span>}
              </div>
            </div>
          </div>

          {/* Mövcud müraciətlər */}
          {requests.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">Müraciətlərim</h3>
              {requests.map(r => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{r.group.name}</span>
                    {r.teacherReply && (
                      <p className="text-xs text-blue-700 mt-1">💬 Müəllim: {r.teacherReply}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[r.status].color}`}>
                    {statusConfig[r.status].icon} {statusConfig[r.status].label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Müəllim səhifəsi linki */}
          {hasAcceptedRequest && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <a href="/student/teacher"
                className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all">
                👨‍🏫 Müəllim səhifəsinə keç →
              </a>
            </div>
          )}

          {/* Yeni müraciət */}
          {!hasAcceptedRequest && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              {groups.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-yellow-700 text-sm">
                  ⚠️ Müəllimin hələ qrupu yoxdur. Müraciət etmək mümkün deyil.
                </div>
              ) : !showRequestForm ? (
                <button onClick={() => setShowRequestForm(true)}
                  className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all">
                  📩 Qeydiyyat müraciəti göndər
                </button>
              ) : (
                <form onSubmit={handleSendRequest} className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-700">Qrup seçin</h3>

                  <div className="space-y-3">
                    {groups.map(g => (
                      <label key={g.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedGroupId === g.id
                            ? "border-blue-900 bg-blue-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}>
                        <input type="radio" name="group" value={g.id}
                          checked={selectedGroupId === g.id}
                          onChange={() => setSelectedGroupId(g.id)}
                          className="mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{g.name}</p>
                          {g.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>
                          )}
                          {g.schedule && (
                            <p className="text-xs text-blue-600 mt-1">🕐 {g.schedule}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">👥 {g._count.members} tələbə</p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Müraciət mətni (isteğe bağlı)
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Müəllimə bir şey yazmaq istəyirsinizsə..."
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none"
                    />
                  </div>

                  {msg && (
                    <p className={`text-sm ${msg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                      {msg}
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button type="button" onClick={() => { setShowRequestForm(false); setMsg(""); }}
                      className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
                      Ləğv et
                    </button>
                    <button type="submit" disabled={requestLoading || !selectedGroupId}
                      className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-semibold py-2.5 rounded-xl text-sm transition-all">
                      {requestLoading ? "Göndərilir..." : "Müraciət et"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm text-center text-gray-400">
          <div className="text-4xl mb-3">👨‍🏫</div>
          <p>Hələ qeydiyyatda olan müəllim yoxdur</p>
        </div>
      )}
    </div>
  );
}