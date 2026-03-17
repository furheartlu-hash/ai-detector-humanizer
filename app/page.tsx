"use client";
import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [humanized, setHumanized] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [humanizing, setHumanizing] = useState(false);

  async function detect() {
    if (!text.trim()) return;
    setDetecting(true);
    setScore(null);
    setReason("");
    const res = await fetch("/api/detect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setScore(data.score);
    setReason(data.reason);
    setDetecting(false);
  }

  async function humanize() {
    if (!text.trim()) return;
    setHumanizing(true);
    setHumanized("");
    const res = await fetch("/api/humanize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setHumanized(data.result);
    setHumanizing(false);
  }

  const scoreColor =
    score === null ? "" : score >= 70 ? "text-red-500" : score >= 40 ? "text-yellow-500" : "text-green-500";

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-2">AI Detector & Humanizer</h1>
        <p className="text-center text-gray-500 mb-8">Detect AI-generated text and rewrite it to sound more human</p>

        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Paste your text here</label>
          <textarea
            className="w-full h-48 border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Paste the text you want to analyze..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={detect}
              disabled={detecting || !text.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition"
            >
              {detecting ? "Detecting..." : "🔍 Detect AI"}
            </button>
            <button
              onClick={humanize}
              disabled={humanizing || !text.trim()}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-medium py-2.5 rounded-xl transition"
            >
              {humanizing ? "Rewriting..." : "✨ Humanize"}
            </button>
          </div>
        </div>

        {score !== null && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-500 mb-1">AI Detection Result</h2>
            <div className={`text-5xl font-bold mb-2 ${scoreColor}`}>{score}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
              <div
                className={`h-2 rounded-full transition-all ${score >= 70 ? "bg-red-500" : score >= 40 ? "bg-yellow-500" : "bg-green-500"}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">{reason}</p>
            <p className="text-xs text-gray-400 mt-2">
              {score >= 70 ? "⚠️ Likely AI-generated" : score >= 40 ? "🤔 Possibly AI-generated" : "✅ Likely human-written"}
            </p>
          </div>
        )}

        {humanized && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Humanized Result</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 mb-1">Original</p>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">{text}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Humanized</p>
                <p className="text-sm text-gray-800 bg-purple-50 rounded-xl p-3 whitespace-pre-wrap">{humanized}</p>
              </div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(humanized)}
              className="mt-4 text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              📋 Copy humanized text
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
