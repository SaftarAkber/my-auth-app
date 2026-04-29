"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function TeacherAboutPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Hakkımda</h1>

      <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        {/* Profil fotoğrafı ve isim */}
        <div className="flex items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-4xl font-bold text-blue-900 overflow-hidden border-4 border-blue-200 flex-shrink-0">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mt-2">
              🎓 Öğretmen
            </span>
          </div>
        </div>

        {/* Bio */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Hakkında</h3>
          {user.bio ? (
            <p className="text-gray-700 leading-relaxed">{user.bio}</p>
          ) : (
            <p className="text-gray-400 italic">Henüz bir şey yazılmadı.</p>
          )}
        </div>

        {/* İletişim */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">İletişim</h3>
          <div className="space-y-3">
            {user.phone && (
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-xl">📱</span>
                <span>{user.phone}</span>
              </div>
            )}
            {user.email && (
              <div className="flex items-center gap-3 text-gray-700">
                <span className="text-xl">✉️</span>
                <span>{user.email}</span>
              </div>
            )}
            {!user.phone && !user.email && (
              <p className="text-gray-400 italic">İletişim bilgisi eklenmedi.</p>
            )}
          </div>
        </div>

        <Link href="/teacher/settings"
          className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-xl transition-all text-sm">
          ⚙️ Profili Düzenle
        </Link>
      </div>
    </div>
  );
}