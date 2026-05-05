"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  schedule: string | null;
  photo: string | null;
  coverPhoto: string | null;
  _count: { members: number };
}

interface VideoPackage {
  id: string;
  name: string;
  isPublished: boolean;
  visibility: string;
  videos: { id: string; title: string; url: string }[];
}

interface TestPackage {
  id: string;
  name: string;
  isPublished: boolean;
  visibility: string;
  _count: { questions: number; attempts: number };
}

interface GroupPost {
  id: string;
  content: string;
  createdAt: string;
  visibility: string;
  images: { id: string; url: string }[];
}

type Tab = "groups" | "videos" | "tests" | "posts";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [videos, setVideos] = useState<VideoPackage[]>([]);
  const [tests, setTests] = useState<TestPackage[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [groupsRes, videosRes, testsRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/video-packages"),
        fetch("/api/packages"),
      ]);
      const groupsData = await groupsRes.json();
      const videosData = await videosRes.json();
      const testsData = await testsRes.json();

      setGroups(groupsData.groups || []);
      setVideos(videosData.packages || []);
      setTests(testsData.packages || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "groups", label: "Qruplar", icon: "🏫" },
    { key: "videos", label: "Videolar", icon: "🎬" },
    { key: "tests", label: "Testlər", icon: "📝" },
    { key: "posts", label: "Paylaşımlar", icon: "📌" },
  ];

  return (
    <div>
      {/* Profil header */}
      {/* Profil header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="h-32 bg-gradient-to-br from-blue-800 to-blue-600">
          {(user as any)?.coverPhoto && (
            <img
              src={(user as any).coverPhoto}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-blue-100 border-4 border-white -mt-12 flex items-center justify-center text-2xl font-bold text-blue-900 overflow-hidden flex-shrink-0 shadow-md">
              {user?.photo ? (
                <img
                  src={user.photo}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="flex-1 mt-2">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              {user?.bio && (
                <p className="text-gray-600 text-sm mt-2">{user.bio}</p>
              )}
              <div className="flex gap-3 mt-2">
                {user?.phone && (
                  <span className="text-sm text-gray-500">📱 {user.phone}</span>
                )}
                {user?.email && (
                  <span className="text-sm text-gray-500">✉️ {user.email}</span>
                )}
              </div>
            </div>
            <Link
              href="/teacher/settings"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium px-4 py-2 rounded-xl text-sm transition-all"
            >
              Düzənlə
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === t.key
                ? "bg-blue-900 text-white"
                : "bg-white border border-gray-200 text-gray-600"
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Qruplar */}
      {activeTab === "groups" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {groups.map((g) => (
            <Link
              key={g.id}
              href={`/teacher/groups/${g.id}`}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:border-blue-900 hover:shadow-md transition-all"
            >
              <div className="h-24 bg-gradient-to-br from-blue-800 to-blue-600">
                {g.coverPhoto && (
                  <img
                    src={g.coverPhoto}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-900">{g.name}</h3>
                {g.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                    {g.description}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  👥 {g._count.members} tələbə
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Videolar */}
      {activeTab === "videos" && (
        <div className="space-y-4">
          {videos.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{pkg.videos.length} video</span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        pkg.visibility === "PUBLIC"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {pkg.visibility === "PUBLIC"
                        ? "Herkese açıq"
                        : "Qrupa xas"}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/teacher/lessons`}
                  className="text-blue-900 text-sm font-medium hover:underline"
                >
                  Düzənlə →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Testlər */}
      {activeTab === "tests" && (
        <div className="space-y-3">
          {tests.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>{pkg._count.questions} sual</span>
                    <span>{pkg._count.attempts} həll</span>
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        pkg.visibility === "PUBLIC"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {pkg.visibility === "PUBLIC"
                        ? "Herkese açıq"
                        : "Qrupa xas"}
                    </span>
                  </div>
                </div>
                <Link
                  href="/teacher/tests"
                  className="text-blue-900 text-sm font-medium hover:underline"
                >
                  Düzənlə →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paylaşımlar */}
      {activeTab === "posts" && (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5"
            >
              <p className="text-gray-900 text-sm leading-relaxed">
                {post.content}
              </p>
              {post.images.length > 0 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  {post.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="w-32 h-24 object-cover rounded-xl border border-gray-100"
                    />
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-gray-400">
                  {new Date(post.createdAt).toLocaleDateString("az-AZ")}
                </p>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    post.visibility === "PUBLIC"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {post.visibility === "PUBLIC" ? "Herkese açıq" : "Qrupa xas"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
