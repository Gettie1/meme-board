import { useState, useEffect, useCallback } from "react";
import type { DragEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";
/* ThemeSupa import removed because @supabase/auth-ui-shared is not available; appearance prop removed from Auth below. */

// ----------------------
// Initialize Supabase
// ----------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ----------------------
// Types
// ----------------------
interface ReactionRow {
  type: "heart" | "laugh" | "wow" | "sad";
  user_id: string;
}

interface Meme {
  id: string;
  url: string;
  caption: string;
  user_id: string;
  created_at: string;
  reactions: { [key: string]: number };
  userReaction?: string;
}

const REACTION_TYPES = ["heart", "laugh", "wow", "sad"] as const;

// ----------------------
// App Component
// ----------------------
function App() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  // small Styles component so CSS is present for both auth and main UI
  const Styles = () => (
    <style>{`
      :root{
        --bg:#0f1724;
        --card:#0b1220;
        --muted:#94a3b8;
        --accent:#06b6d4;
        --accent-2:#7c3aed;
        --glass: rgba(255,255,255,0.04);
      }
      *{box-sizing:border-box}
      html,body,#root{height:100%}
      body{
        margin:0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        background: linear-gradient(180deg, #071228 0%, #061026 100%);
        color:#e6eef8;
        -webkit-font-smoothing:antialiased;
      }
      .app {
        max-width:1100px;
        margin:32px auto;
        padding:28px;
      }
      .topbar {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        margin-bottom:20px;
      }
      .brand {
        display:flex;
        align-items:center;
        gap:12px;
      }
      .logo {
        width:44px;
        height:44px;
        border-radius:10px;
        background:linear-gradient(135deg,var(--accent),var(--accent-2));
        box-shadow:0 6px 18px rgba(124,58,237,0.18);
        display:flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
      }
      h1 { margin:0; font-size:20px; letter-spacing:0.2px; }
      .subtitle { color:var(--muted); font-size:13px; margin-top:4px; }

      .uploader {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        border:1px solid rgba(255,255,255,0.04);
        padding:16px;
        border-radius:12px;
        display:flex;
        gap:12px;
        align-items:center;
      }
      .dropzone {
        flex:1;
        border:2px dashed rgba(255,255,255,0.04);
        padding:18px;
        border-radius:10px;
        text-align:center;
        cursor:pointer;
        transition:all .18s ease;
        background:var(--glass);
      }
      .dropzone.dragover {
        border-color: rgba(6,182,212,0.9);
        box-shadow: 0 6px 26px rgba(6,182,212,0.06);
        transform: translateY(-2px);
      }
      .controls {
        display:flex;
        gap:8px;
        align-items:center;
      }
      .file-preview {
        display:flex;
        align-items:center;
        gap:8px;
        color:var(--muted);
        font-size:13px;
      }
      .file-thumb {
        width:56px;
        height:56px;
        border-radius:8px;
        object-fit:cover;
        background:#071022;
      }
      .caption {
        padding:8px 10px;
        border-radius:8px;
        background:transparent;
        border:1px solid rgba(255,255,255,0.04);
        color:inherit;
        min-width:220px;
      }
      .btn {
        border:0;
        padding:8px 12px;
        border-radius:8px;
        cursor:pointer;
        font-weight:600;
        background:linear-gradient(90deg,var(--accent),var(--accent-2));
        color:white;
        box-shadow: 0 8px 24px rgba(7,20,40,0.6);
      }

      .grid {
        margin-top:20px;
        display:grid;
        gap:16px;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      }
      .card {
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        border:1px solid rgba(255,255,255,0.03);
        padding:12px;
        border-radius:12px;
        transition: transform .12s ease, box-shadow .12s ease;
      }
      .card:hover {
        transform: translateY(-6px);
        box-shadow:0 14px 40px rgba(2,6,23,0.6);
      }
      .meme-img {
        width:100%;
        height:180px;
        object-fit:cover;
        border-radius:8px;
        display:block;
        margin-bottom:10px;
        background:#081022;
      }
      .meta {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }
      .caption-text {
        color:#dbeafe;
        font-size:14px;
        margin:0 0 8px 0;
        min-height:34px;
        overflow:hidden;
        text-overflow:ellipsis;
        display:-webkit-box;
        -webkit-line-clamp:2;
        -webkit-box-orient:vertical;
      }
      .reactions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }
      .reaction-btn {
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:6px 8px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,0.04);
        background:transparent;
        color:var(--muted);
        cursor:pointer;
        font-weight:600;
      }
      .reaction-btn.active {
        background:linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        color:#111827;
      }
      .count {
        background:rgba(255,255,255,0.06);
        padding:3px 6px;
        border-radius:999px;
        font-size:12px;
        color:var(--muted);
      }

      .auth-card {
        max-width:420px;
        margin:48px auto;
        padding:22px;
        border-radius:12px;
        background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
        border:1px solid rgba(255,255,255,0.04);
        text-align:center;
      }

      @media (max-width:640px){
        .meme-img { height:140px }
        .file-thumb { width:48px; height:48px }
        .app { padding:16px }
      }
    `}</style>
  );

  // ----------------------
  // Auth session
  // ----------------------
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // ----------------------
  // Fetch memes
  // ----------------------
  const fetchMemes = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("memes")
      .select(`
        id, url, caption, user_id, created_at,
        reactions:reactions(type, user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) return console.error(error);

    if (data) {
      type MemeRow = {
        id: string;
        url: string;
        caption: string;
        user_id: string;
        created_at: string;
        reactions: ReactionRow[];
      };

      const formatted: Meme[] = (data as MemeRow[]).map((m) => {
        const reactionsCount: { [key: string]: number } = {
          heart: 0,
          laugh: 0,
          wow: 0,
          sad: 0,
        };
        let userReaction: string | undefined = undefined;

        m.reactions.forEach((r) => {
          reactionsCount[r.type] = (reactionsCount[r.type] || 0) + 1;
          if (r.user_id === userId) userReaction = r.type;
        });

        return {
          id: m.id,
          url: m.url,
          caption: m.caption,
          user_id: m.user_id,
          created_at: m.created_at,
          reactions: reactionsCount,
          userReaction,
        };
      });

      setMemes(formatted);
    }
  }, [userId]);

  useEffect(() => {
    fetchMemes();
  }, [fetchMemes]);

  // ----------------------
  // Cloudinary upload
  // ----------------------
  const uploadToCloudinary = async (file: File) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET!;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const data = await res.json();
    return data.secure_url as string;
  };

  const handleUpload = async () => {
    if (!file || !userId) return alert("Select a file and log in first!");
    const url = await uploadToCloudinary(file);

    const { error } = await supabase.from("memes").insert([
      {
        url,
        caption,
        user_id: userId,
      },
    ]);

    if (error) return console.error(error);

    setFile(null);
    setCaption("");
    fetchMemes();
  };

  // ----------------------
  // Reactions
  // ----------------------
  const handleReaction = async (memeId: string, reaction: string) => {
    if (!userId) return alert("You must be logged in!");

    const { data: existing, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("meme_id", memeId)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") return console.error(error);

    if (existing) {
      if (existing.type === reaction) {
        await supabase.from("reactions").delete().eq("id", existing.id);
      } else {
        await supabase
          .from("reactions")
          .update({ type: reaction })
          .eq("id", existing.id);
      }
    } else {
      await supabase
        .from("reactions")
        .insert([{ meme_id: memeId, user_id: userId, type: reaction }]);
    }

    fetchMemes();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    (e.currentTarget as HTMLElement).classList.remove("dragover");
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("dragover");
  };

  // ----------------------
  // Render
  // ----------------------
  if (!userId) {
    return (
      <div className="app">
        <Styles />
        <div className="auth-card">
          <h2 style={{ margin: 0 }}>Login to Meme Board</h2>
          <p style={{ marginTop: 8, color: "var(--muted)" }}>
            Sign in with Google or GitHub to start sharing memes.
          </p>
          <div style={{ marginTop: 18 }}>
            <Auth supabaseClient={supabase} providers={["google", "github"]} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Styles />

      <div className="topbar">
        <div className="brand">
          <div className="logo">MB</div>
          <div>
            <h1>Meme Board 🤣</h1>
            <div className="subtitle">Share. React. Laugh.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>User: {userId.slice(0, 6)}</div>
          <button
            className="btn"
            onClick={async () => {
              await supabase.auth.signOut();
              setUserId(null);
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <div className="uploader">
        <div
          className={`dropzone`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("dragover")}
          onClick={() => {
            const el = document.getElementById("file-input") as HTMLInputElement | null;
            el?.click();
          }}
        >
          <div style={{ fontWeight: 700 }}>Drag & Drop your meme here</div>
          <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 13 }}>
            Or click to select an image (PNG, JPG, GIF)
          </div>
        </div>

        <div className="controls">
          <input
            id="file-input"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <input
            className="caption"
            type="text"
            placeholder="Add a caption..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {file ? (
                <div className="file-preview">
                  <img
                    src={URL.createObjectURL(file)}
                    className="file-thumb"
                    alt="preview"
                    onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                  />
                  <div style={{ maxWidth: 140 }}>
                    <div style={{ fontSize: 13, color: "#dbeafe", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>{Math.round(file.size / 1024)} KB</div>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                onClick={() => {
                  const el = document.getElementById("file-input") as HTMLInputElement | null;
                  el?.click();
                }}
              >
                Choose File
              </button>

              <button
                className="btn"
                onClick={handleUpload}
                style={{ opacity: file ? 1 : 0.6, pointerEvents: file ? "auto" : "none" }}
              >
                Upload Meme
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid">
        {memes.map((meme) => (
          <div key={meme.id} className="card">
            <img src={meme.url} alt={`meme-${meme.id}`} className="meme-img" />
            <p className="caption-text">{meme.caption}</p>

            <div className="meta">
              <div className="reactions">
                {REACTION_TYPES.map((reaction) => {
                  const emoji =
                    reaction === "heart"
                      ? "❤️"
                      : reaction === "laugh"
                      ? "😂"
                      : reaction === "wow"
                      ? "😮"
                      : "😢";

                  const active = meme.userReaction === reaction;

                  return (
                    <button
                      key={reaction}
                      className={`reaction-btn ${active ? "active" : ""}`}
                      onClick={() => handleReaction(meme.id, reaction)}
                      title={reaction}
                    >
                      <span style={{ fontSize: 16 }}>{emoji}</span>
                      <span className="count">{meme.reactions[reaction]}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {new Date(meme.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
