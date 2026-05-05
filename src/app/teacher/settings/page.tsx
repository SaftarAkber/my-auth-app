"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";

type Section = "profile" | "contact";

export default function TeacherSettingsPage() {
  const { user, refreshUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("profile");
  const [profileForm, setProfileForm] = useState({ name: "", bio: "", photo: "", coverPhoto: "" });
  const [contactForm, setContactForm] = useState({ phone: "", email: "" });
  const [otpForm, setOtpForm] = useState({ type: "", contact: "", code: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name,
        bio: user.bio || "",
        photo: user.photo || "",
        coverPhoto: (user as any).coverPhoto || "",
      });
      setContactForm({
        phone: user.phone || "",
        email: user.email || "",
      });
    }
  }, [user]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setProfileForm(f => ({ ...f, photo: data.url }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) setProfileForm(f => ({ ...f, coverPhoto: data.url }));
    } finally {
      setUploadingCover(false);
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      if (!res.ok) throw new Error("Xəta");
      setMsg("✅ Profil yeniləndi");
      await refreshUser();
    } catch {
      setMsg("❌ Xəta baş verdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleContactUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const type = contactForm.phone !== user?.phone ? "phone" : "email";
      const contact = type === "phone" ? contactForm.phone : contactForm.email;
      const res = await fetch("/api/auth/update-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, contact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOtpForm({ type, contact, code: "" });
      setStep("otp");
      setMsg("✅ OTP göndərildi");
    } catch (err: any) {
      setMsg("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleOtpVerify(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/verify-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(otpForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg("✅ Əlaqə yeniləndi");
      setStep("form");
      await refreshUser();
    } catch (err: any) {
      setMsg("❌ " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tənzimləmələr</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "profile" as const, label: "Profil", icon: "👤" },
          { key: "contact" as const, label: "Əlaqə", icon: "📞" },
        ].map(t => (
          <button key={t.key} onClick={() => setActiveSection(t.key)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeSection === t.key
                ? "bg-blue-900 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${
          msg.startsWith("✅") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>{msg}</div>
      )}

      {/* Profil */}
      {activeSection === "profile" && (
        <form onSubmit={handleProfileSave} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Arka plan şəkli</label>
            <div className="relative h-32 rounded-xl overflow-hidden bg-gradient-to-br from-blue-800 to-blue-600 mb-2">
              {profileForm.coverPhoto && (
                <img src={profileForm.coverPhoto} alt="" className="w-full h-full object-cover" />
              )}
              <button type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="absolute bottom-2 right-2 bg-white/90 hover:bg-white text-gray-700 font-medium px-3 py-1.5 rounded-lg text-xs transition-all">
                {uploadingCover ? "Yüklənir..." : "Dəyişdir"}
              </button>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*"
              onChange={handleCoverUpload} className="hidden" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profil şəkli</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-900 overflow-hidden border-2 border-blue-200">
                {profileForm.photo ? (
                  <img src={profileForm.photo} alt="" className="w-full h-full object-cover" />
                ) : user?.name.charAt(0).toUpperCase()}
              </div>
              <button type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl text-sm transition-all">
                {uploadingPhoto ? "Yüklənir..." : "Şəkil yüklə"}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*"
                onChange={handlePhotoUpload} className="hidden" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ad</label>
            <input type="text" value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea value={profileForm.bio}
              onChange={e => setProfileForm(f => ({ ...f, bio: e.target.value }))}
              rows={4} placeholder="Özünüz haqqında qısa məlumat..."
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 resize-none" />
          </div>

          <button type="submit" disabled={saving}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-3 rounded-xl transition-all">
            {saving ? "Saxlanılır..." : "Yadda saxla"}
          </button>
        </form>
      )}

      {/* Əlaqə */}
      {activeSection === "contact" && step === "form" && (
        <form onSubmit={handleContactUpdate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
            <input type="tel" value={contactForm.phone}
              onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+994XXXXXXXXX"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={contactForm.email}
              onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
          </div>
          <button type="submit" disabled={saving}
            className="w-full bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-3 rounded-xl transition-all">
            {saving ? "Göndərilir..." : "Yenilə"}
          </button>
        </form>
      )}

      {activeSection === "contact" && step === "otp" && (
        <form onSubmit={handleOtpVerify} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <p className="text-sm text-gray-600">
            {otpForm.type === "phone" ? otpForm.contact : otpForm.contact} ünvanına OTP göndərildi.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">OTP kodu</label>
            <input type="text" value={otpForm.code}
              onChange={e => setOtpForm(f => ({ ...f, code: e.target.value }))} required
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep("form")}
              className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm">
              Geri
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl text-sm">
              {saving ? "Yoxlanılır..." : "Təsdiqlə"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}