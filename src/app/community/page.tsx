"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";

interface Post {
  id: string;
  displayName: string;
  body: string;
  createdAt: string;
  tips: boolean;
  likes: number;
}

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [body, setBody] = useState("");
  const [name, setName] = useState("Anonymous mover");

  useEffect(() => {
    fetch("/api/community")
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {
        setPosts([
          {
            id: "offline",
            displayName: "MotionRx Coach",
            body: "Community is offline-cached lightly. Share general tips only—no medical diagnosis requests in public posts.",
            createdAt: new Date().toISOString(),
            tips: true,
            likes: 0,
          },
        ]);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const res = await fetch("/api/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name, body, tips: true }),
    });
    if (res.ok) {
      const data = await res.json();
      setPosts((p) => [data.post, ...p]);
      setBody("");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-brand-950">
          <Users className="h-7 w-7 text-brand-600" />
          Community
        </h1>
        <p className="mt-1 text-sm text-brand-700/85">
          Share progress tips and encouragement. Keep posts general; personal medical questions
          belong with licensed professionals.
        </p>
      </div>

      <form onSubmit={submit} className="card space-y-3 p-5">
        <div>
          <label className="label" htmlFor="display">
            Display name
          </label>
          <input
            id="display"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="post">
            Your tip or win
          </label>
          <textarea
            id="post"
            className="input min-h-[100px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="e.g. Desk cat-cows every hour helped my mid-back stiffness this week."
          />
        </div>
        <button type="submit" className="btn-primary">
          Post
        </button>
      </form>

      <ul className="space-y-3">
        {posts.map((p) => (
          <li key={p.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-brand-900">{p.displayName}</p>
              <time className="text-xs text-brand-500">
                {new Date(p.createdAt).toLocaleString()}
              </time>
            </div>
            <p className="mt-2 text-sm text-brand-800">{p.body}</p>
            {p.tips && <span className="chip mt-2">Tip</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
