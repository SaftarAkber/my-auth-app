"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Question {
  id: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  options: { A: string; B: string; C: string; D: string; E: string } | null;
  correctAnswer: string | null;
  isActive: boolean;
  order: number;
}

interface Package {
  id: string;
  name: string;
  questions: Question[];
  collection: { name: string };
}

interface QForm {
  text: string;
  type: "MULTIPLE_CHOICE" | "OPEN_ENDED";
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer: string;
}

export default function PackageQuestionsPage() {
  const params = useParams();
  const collectionId = params.id as string;
  const packageId = params.packageId as string;

  const [pkg, setPkg] = useState<Package | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editQ, setEditQ] = useState<Question | null>(null);
  const [form, setForm] = useState<QForm>({
    text: "",
    type: "MULTIPLE_CHOICE",
    optionA: "", optionB: "", optionC: "", optionD: "", optionE: "",
    correctAnswer: "A",
  });
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [allToggling, setAllToggling] = useState(false);

  useEffect(() => { fetchPackage(); }, [packageId]);

  async function fetchPackage() {
    const res = await fetch(`/api/packages/${packageId}`);
    const data = await res.json();
    setPkg(data.package);
    setLoading(false);
  }

  function openAdd() {
    setEditQ(null);
    setForm({
      text: "", type: "MULTIPLE_CHOICE",
      optionA: "", optionB: "", optionC: "", optionD: "", optionE: "",
      correctAnswer: "A",
    });
    setShowForm(true);
  }

  function openEdit(q: Question) {
    setEditQ(q);
    setForm({
      text: q.text,
      type: q.type,
      optionA: q.options?.A || "",
      optionB: q.options?.B || "",
      optionC: q.options?.C || "",
      optionD: q.options?.D || "",
      optionE: q.options?.E || "",
      correctAnswer: q.correctAnswer || "A",
    });
    setShowForm(true);
  }

  function getOptionValue(opt: string): string {
    const key = `option${opt}` as keyof QForm;
    return form[key] as string;
  }

  function setOptionValue(opt: string, value: string) {
    const key = `option${opt}` as keyof QForm;
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        text: form.text,
        type: form.type,
        options: form.type === "MULTIPLE_CHOICE" ? {
          A: form.optionA, B: form.optionB, C: form.optionC,
          D: form.optionD, E: form.optionE,
        } : null,
        correctAnswer: form.type === "MULTIPLE_CHOICE" ? form.correctAnswer : null,
      };

      if (editQ) {
        await fetch(`/api/questions/${editQ.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`/api/packages/${packageId}/questions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, order: pkg?.questions.length || 0 }),
        });
      }
      setShowForm(false);
      await fetchPackage();
    } finally {
      setSaving(false);
    }
  }

  async function toggleQuestion(q: Question) {
    setToggling(q.id);
    try {
      await fetch(`/api/questions/${q.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !q.isActive }),
      });
      await fetchPackage();
    } finally {
      setToggling(null);
    }
  }

  async function toggleAll(active: boolean) {
    if (!pkg) return;
    setAllToggling(true);
    try {
      await Promise.all(
        pkg.questions.map(q =>
          fetch(`/api/questions/${q.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: active }),
          })
        )
      );
      await fetchPackage();
    } finally {
      setAllToggling(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu sualı silmək istədiyinizdən əminsiniz?")) return;
    await fetch(`/api/questions/${id}`, { method: "DELETE" });
    await fetchPackage();
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="flex gap-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-3 h-3 bg-blue-900 rounded-full animate-bounce"
            style={{ animationDelay: `${i*0.15}s` }} />
        ))}
      </div>
    </div>
  );

  if (!pkg) return <div className="text-center py-20 text-gray-400">Paket tapılmadı</div>;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        <Link href="/teacher/tests" className="text-gray-400 hover:text-gray-600">Testlər</Link>
        <span className="text-gray-300">/</span>
        <Link href={`/teacher/tests/${collectionId}`} className="text-gray-400 hover:text-gray-600">
          {pkg.collection.name}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-900 font-medium">{pkg.name}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pkg.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{pkg.questions.length} sual</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => toggleAll(true)} disabled={allToggling}
            className="px-3 py-2 bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-700 rounded-xl text-xs font-medium transition-all">
            {allToggling ? "..." : "Hepsini Aktif"}
          </button>
          <button onClick={() => toggleAll(false)} disabled={allToggling}
            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 text-gray-600 rounded-xl text-xs font-medium transition-all">
            {allToggling ? "..." : "Hepsini Pasif"}
          </button>
          <button onClick={openAdd}
            className="bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2 rounded-xl text-sm transition-all">
            + Sual Əlavə et
          </button>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editQ ? "Sualı düzənlə" : "Yeni sual əlavə et"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Tip seçimi */}
              <div className="flex gap-3">
                {(["MULTIPLE_CHOICE", "OPEN_ENDED"] as const).map(t => (
                  <button key={t} type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      form.type === t
                        ? "border-blue-900 bg-blue-50 text-blue-900"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}>
                    {t === "MULTIPLE_CHOICE" ? "🔤 Çoxseçimli" : "✏️ Açıq uçlu"}
                  </button>
                ))}
              </div>

              {/* Sual mətni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sual mətni</label>
                <textarea value={form.text}
                  onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                  rows={3} required
                  className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900 resize-none" />
              </div>

              {/* Şıklar */}
              {form.type === "MULTIPLE_CHOICE" && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Cavab variantları</label>
                  {["A", "B", "C", "D", "E"].map(opt => (
                    <div key={opt} className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        form.correctAnswer === opt ? "bg-green-500 text-white" : "bg-gray-100 text-gray-600"
                      }`}>{opt}</span>
                      <input type="text"
                        value={getOptionValue(opt)}
                        onChange={e => setOptionValue(opt, e.target.value)}
                        placeholder={`${opt} variantı`}
                        className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-900/30 focus:border-blue-900" />
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, correctAnswer: opt }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          form.correctAnswer === opt
                            ? "bg-green-500 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-green-50"
                        }`}>
                        {form.correctAnswer === opt ? "✓ Doğru" : "Doğru"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 text-gray-600 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50">
                  Ləğv et
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-900 hover:bg-blue-800 disabled:bg-blue-900/50 text-white font-medium py-2.5 rounded-xl text-sm">
                  {saving ? "Saxlanılır..." : "Saxla"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sual listesi */}
      {pkg.questions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center text-gray-400">
          <div className="text-4xl mb-3">❓</div>
          <p>Hələ sual yoxdur</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pkg.questions.map((q, idx) => (
            <div key={q.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
              q.isActive ? "border-gray-200" : "border-gray-100 opacity-50"
            }`}>
              <div className="flex items-start gap-4">
                <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      q.type === "MULTIPLE_CHOICE"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {q.type === "MULTIPLE_CHOICE" ? "Çoxseçimli" : "Açıq uçlu"}
                    </span>
                  </div>
                  <p className="text-gray-900 text-sm font-medium">{q.text}</p>
                  {q.type === "MULTIPLE_CHOICE" && q.options && (
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      {Object.entries(q.options).map(([k, v]) => v && (
                        <span key={k} className={`text-xs px-2 py-1 rounded-lg ${
                          q.correctAnswer === k
                            ? "bg-green-100 text-green-700 font-medium"
                            : "bg-gray-50 text-gray-600"
                        }`}>
                          {k}: {v} {q.correctAnswer === k && "✓"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleQuestion(q)}
                    disabled={toggling === q.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      q.isActive ? "bg-green-500" : "bg-gray-300"
                    }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      q.isActive ? "translate-x-6" : "translate-x-1"
                    }`} />
                  </button>
                  <button onClick={() => openEdit(q)}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 text-sm transition-all">✏️</button>
                  <button onClick={() => handleDelete(q.id)}
                    className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 text-sm transition-all">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}