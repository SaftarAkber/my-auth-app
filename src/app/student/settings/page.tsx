"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

type ContactStep = "idle" | "input" | "otp" | "done";

export default function StudentSettingsPage() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [photo, setPhoto] = useState(user?.photo || "");
  const [profileMsg, setProfileMsg] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  const [contactType, setContactType] = useState<"phone" | "email">("phone");
  const [contactValue, setContactValue] = useState("");
  const [contactCode, setContactCode] = useState("");
  const [contactStep, setContactStep] = useState<ContactStep>("idle");
  const [contactMsg, setContactMsg] = useState("");
  const [contactLoading, setContactLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bio, photo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      setProfileMsg("✅ Profil yeniləndi");
    } catch (err: unknown) {
      setProfileMsg("❌ " + (err instanceof Error ? err.message : "Xəta baş verdi"));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleSendContactOtp(e: React.FormEvent) {
    e.preventDefault();
    setContactLoading(true);
    setContactMsg("");
    try {
      const res = await fetch("/api/auth/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contactType, value: contactValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setContactStep("otp");
      setContactMsg("Kod göndərildi");
    } catch (err: unknown) {
      setContactMsg("❌ " + (err instanceof Error ? err.message : "Xəta baş verdi"));
    } finally {
      setContactLoading(false);
    }
  }

  async function handleVerifyContact(e: React.FormEvent) {
    e.preventDefault();
    setContactLoading(true);
    setContactMsg("");
    try {
      const res = await fetch("/api/auth/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: contactType, value: contactValue, code: contactCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await refreshUser();
      setContactStep("done");
      setContactMsg("✅ Məlumat yeniləndi");
      setContactValue("");
      setContactCode("");
    } catch (err: unknown) {
      setContactMsg("❌ " + (err instanceof Error ? err.message : "Xəta baş verdi"));
    } finally {
      setContactLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Ayarlar</h1>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Profil Məlumatları</h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl font-bold text-blue-900 overflow-hidden border-2 border-blue-200">
            {photo ? (
              <img src={photo} alt="Profil" className="w-full h-full object-cover" onError={() => setPhoto("")} />
            ) : (
              user?.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Profil Şəkli URL</label>
            <input type="url" value={photo} onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://misal.com/shekil.jpg"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
            />
          </div>
        </div>

        <form onSubmit={handleProfileSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Haqqımda</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
              placeholder="Özünüz haqqında qısa bir yazı..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all resize-none"
            />
          </div>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
              {profileMsg}
            </p>
          )}

          <button type="submit" disabled={profileLoading}
            className="bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium px-6 py-2.5 rounded-xl transition-all text-sm">
            {profileLoading ? "Yadda saxlanılır..." : "Yadda saxla"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Əlaqə Məlumatları</h2>
        <p className="text-gray-500 text-sm mb-6">Telefon və ya email əlavə edib dəyişdirə bilərsiniz.</p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">WhatsApp</p>
            <p className="text-sm font-medium text-gray-900">{user?.phone || "Əlavə edilməyib"}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Email</p>
            <p className="text-sm font-medium text-gray-900">{user?.email || "Əlavə edilməyib"}</p>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          {(["phone", "email"] as const).map((t) => (
            <button key={t} type="button"
              onClick={() => { setContactType(t); setContactStep("input"); setContactMsg(""); setContactValue(""); setContactCode(""); }}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                contactType === t && contactStep !== "idle"
                  ? "border-blue-900 bg-blue-50 text-blue-900"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}>
              {t === "phone" ? "📱 Telefonu yenilə" : "✉️ Email-i yenilə"}
            </button>
          ))}
        </div>

        {(contactStep === "input" || contactStep === "otp") && (
          <div className="space-y-4">
            {contactStep === "input" && (
              <form onSubmit={handleSendContactOtp} className="space-y-3">
                <input
                  type={contactType === "phone" ? "tel" : "email"}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  placeholder={contactType === "phone" ? "+994501234567" : "misal@gmail.com"}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all text-sm"
                />
                <button type="submit" disabled={contactLoading}
                  className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl transition-all text-sm">
                  {contactLoading ? "Göndərilir..." : "Kod göndər"}
                </button>
              </form>
            )}

            {contactStep === "otp" && (
              <form onSubmit={handleVerifyContact} className="space-y-3">
                <p className="text-sm text-gray-600">
                  {contactType === "phone" ? `📱 ${contactValue}` : `✉️ ${contactValue}`} ünvanına kod göndərildi
                </p>
                <input type="text" value={contactCode}
                  onChange={(e) => setContactCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456" maxLength={6} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] font-mono text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 transition-all"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setContactStep("input")}
                    className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-all">
                    ← Geri
                  </button>
                  <button type="submit" disabled={contactLoading}
                    className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl transition-all text-sm">
                    {contactLoading ? "Təsdiqlənir..." : "Təsdiqlə"}
                  </button>
                </div>
              </form>
            )}

            {contactMsg && (
              <p className={`text-sm ${contactMsg.startsWith("✅") ? "text-green-600" : contactMsg === "Kod göndərildi" ? "text-blue-600" : "text-red-600"}`}>
                {contactMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}