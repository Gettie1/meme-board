// App.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import type { DragEvent } from "react";
import { createClient } from "@supabase/supabase-js";
import { Auth } from "@supabase/auth-ui-react";

/* ----------------------
   Supabase init
   ---------------------- */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/* ----------------------
   Types
   ---------------------- */
interface ReactionRow {
  type: "heart" | "laugh" | "wow" | "sad";
  user_id: string;
}

interface Meme {
  id: string;
  url: string;
  caption?: string;
  caption_top?: string | null;
  caption_bottom?: string | null;
  user_id?: string | null;
  category?: string | null;
  template_id?: string | null;
  created_at: string;
  reactions: { [key: string]: number };
  userReaction?: string;
}

interface Template {
  id: string;
  name: string;
  url: string;
  category?: string | null;
}

const REACTION_TYPES = ["heart", "laugh", "wow", "sad"] as const;
const PRESET_CATEGORIES = ["Funny", "Tech", "Animals", "Relatable", "Sports", "Other"];

/* ----------------------
   App
   ---------------------- */
function App() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  /* Template & Generator state */
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [category, setCategory] = useState<string>("");
  const [customCategory, setCustomCategory] = useState<string>("");
  const [topText, setTopText] = useState<string>("");
  const [bottomText, setBottomText] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  /* ----------------------
     Small Styles (kept from your existing file)
     ---------------------- */
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

      .template-list { display:flex; gap:8px; overflow:auto; padding:8px 0; }
      .template-thumb { width:96px; height:96px; object-fit:cover; border-radius:8px; cursor:pointer; border:2px solid transparent; }
      .template-thumb.selected { border-color: var(--accent); }

      @media (max-width:640px){
        .meme-img { height:140px }
        .file-thumb { width:48px; height:48px }
        .app { padding:16px }
      }
    `}</style>
  );

  /* ----------------------
     Auth session (unchanged)
     ---------------------- */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      // unsubscribe
      try {
        listener.subscription.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, []);

  /* ----------------------
     Fetch memes (updated to include category + caption_top/bottom)
     ---------------------- */
  const fetchMemes = useCallback(async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from("memes")
      .select(`
        id, url, caption, caption_top, caption_bottom, category, template_id, user_id, created_at,
        reactions:reactions(type, user_id)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    if (data) {
      type MemeRow = {
        id: string;
        url: string;
        caption?: string | null;
        caption_top?: string | null;
        caption_bottom?: string | null;
        category?: string | null;
        template_id?: string | null;
        user_id?: string | null;
        created_at: string;
        reactions: ReactionRow[];
      };

      const formatted: Meme[] = (data as MemeRow[]).map((m) => {
        const reactionsCount: { [key: string]: number } = { heart: 0, laugh: 0, wow: 0, sad: 0 };
        let userReaction: string | undefined = undefined;

        (m.reactions || []).forEach((r) => {
          reactionsCount[r.type] = (reactionsCount[r.type] || 0) + 1;
          if (r.user_id === userId) userReaction = r.type;
        });

        // Build caption from caption_top + caption_bottom if they exist, else use caption
        const builtCaption =
          (m.caption_top || m.caption_bottom)
            ? `${m.caption_top ?? ""}${m.caption_top && m.caption_bottom ? " · " : ""}${m.caption_bottom ?? ""}`.trim()
            : m.caption ?? "";

        return {
          id: m.id,
          url: (m.url as unknown as string) || "",
          caption: builtCaption,
          caption_top: m.caption_top ?? null,
          caption_bottom: m.caption_bottom ?? null,
          user_id: m.user_id ?? null,
          category: m.category ?? null,
          template_id: m.template_id ?? null,
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
    // fetch templates below after auth check
    if (userId) fetchTemplates();
  }, [fetchMemes]);

  /* ----------------------
     Fetch templates
     ---------------------- */
  const fetchTemplates = useCallback(async () => {
    const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("fetchTemplates error", error);
      return;
    }
    setTemplates(data || []);
  }, []);

  /* ----------------------
     Cloudinary upload helper (unchanged)
     ---------------------- */
  const uploadToCloudinary = async (file: File) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME!;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET!;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    return data.secure_url as string;
  };

  /* ----------------------
     Upload normal meme (unchanged)
     ---------------------- */
  const handleUpload = async () => {
    if (!file || !userId) return alert("Select a file and log in first!");
    const url = await uploadToCloudinary(file);

    const { error } = await supabase.from("memes").insert([
      {
        url,
        caption,
        user_id: userId,
        category: category === "Other" ? customCategory || null : category || null,
      },
    ]);

    if (error) {
      console.error(error);
      return;
    }

    setFile(null);
    setCaption("");
    setCategory("");
    setCustomCategory("");
    fetchMemes();
  };

  /* ----------------------
     Meme generator: render preview onto canvas
     ---------------------- */
  useEffect(() => {
    // Render preview whenever template / texts change
    const canvas = canvasRef.current;
    if (!canvas || !selectedTemplate) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = selectedTemplate.url;

    img.onload = () => {
      // Fit image into canvas while keeping aspect ratio
      const maxW = 500;
      const maxH = 400;
      canvas.width = maxW;
      canvas.height = maxH;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw image to fill
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // text style (Impact-like)
      const fontBase = Math.round(canvas.width / 12);
      ctx.font = `bold ${fontBase}px Impact, Arial`;
      ctx.textAlign = "center";
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = Math.max(2, Math.round(fontBase / 10));
      ctx.lineJoin = "round";

      const drawText = (text: string, y: number) => {
        const lines = text.split("\n");
        lines.forEach((line, i) => {
          const ty = y + i * (fontBase + 6);
          ctx.strokeText(line.toUpperCase(), canvas.width / 2, ty);
          ctx.fillText(line.toUpperCase(), canvas.width / 2, ty);
        });
      };

      if (topText) drawText(topText, fontBase);
      if (bottomText) {
        // bottom aligned
        const bottomY = canvas.height - 20 - (bottomText.split("\n").length - 1) * (fontBase + 6);
        drawText(bottomText, bottomY);
      }
    };
  }, [selectedTemplate, topText, bottomText]);

  /* ----------------------
     Upload generated meme (canvas -> Cloudinary -> insert)
     ---------------------- */
  const uploadGeneratedMeme = async () => {
    if (!selectedTemplate || !userId) return alert("Select a template and log in first!");

    const canvas = canvasRef.current!;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return console.error("No blob generated");
      const file = new File([blob], `meme-${Date.now()}.png`, { type: "image/png" });
      const url = await uploadToCloudinary(file);

      const { error } = await supabase.from("memes").insert([
        {
          url,
          caption: `${topText || ""}${topText && bottomText ? " · " : ""}${bottomText || ""}`.trim(),
          caption_top: topText || null,
          caption_bottom: bottomText || null,
          user_id: userId,
          category: selectedTemplate.category ?? null,
          template_id: selectedTemplate.id,
        },
      ]);

      if (error) {
        console.error("insert generated meme error", error);
        return;
      }

      // cleanup
      setTopText("");
      setBottomText("");
      setSelectedTemplate(null);
      fetchMemes();
    }, "image/png");
  };

  /* ----------------------
     Reactions (unchanged)
     ---------------------- */
  const handleReaction = async (memeId: string, reaction: string) => {
    if (!userId) return alert("You must be logged in!");

    const { data: existing, error } = await supabase
      .from("reactions")
      .select("*")
      .eq("meme_id", memeId)
      .eq("user_id", userId)
      .single();

    if (error) {
      const errCode = (error as { code?: string }).code;
      if (errCode !== "PGRST116") return console.error(error);
    }

    if (existing) {
      if (existing.type === reaction) {
        await supabase.from("reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("reactions").update({ type: reaction }).eq("id", existing.id);
      }
    } else {
      await supabase.from("reactions").insert([{ meme_id: memeId, user_id: userId, type: reaction }]);
    }

    fetchMemes();
  };

  /* ----------------------
     Drag handlers (unchanged)
     ---------------------- */
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
    (e.currentTarget as HTMLElement).classList.remove("dragover");
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.add("dragover");
  };

  /* ----------------------
     Render
     ---------------------- */
  if (!userId) {
    return (
      <div className="app">
        <Styles />
        <div className="auth-card">
          <h2 style={{ margin: 0 }}>Login to Meme Board</h2>
          <p style={{ marginTop: 8, color: "var(--muted)" }}>Sign in with Google or GitHub to start sharing memes.</p>
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

      {/* Uploader + Generator Column */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
        {/* Left: Uploader */}
        <div className="uploader" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <div
            className={`dropzone`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={(e) => (e.currentTarget as HTMLElement).classList.remove("dragover")}
            onClick={() => (document.getElementById("file-input") as HTMLInputElement | null)?.click()}
            style={{ marginBottom: 12 }}
          >
            <div style={{ fontWeight: 700 }}>Drag & Drop your meme here</div>
            <div style={{ color: "var(--muted)", marginTop: 6, fontSize: 13 }}>Or click to select an image (PNG, JPG, GIF)</div>
          </div>

          <div className="controls" style={{ marginTop: 8 }}>
            <input id="file-input" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <input className="caption" type="text" placeholder="Add a caption..." value={caption} onChange={(e) => setCaption(e.target.value)} />

            <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {file ? (
                  <div className="file-preview">
                    <img src={URL.createObjectURL(file)} className="file-thumb" alt="preview" onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)} />
                    <div style={{ maxWidth: 140 }}>
                      <div style={{ fontSize: 13, color: "#dbeafe", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>{Math.round(file.size / 1024)} KB</div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => (document.getElementById("file-input") as HTMLInputElement | null)?.click()}>Choose File</button>

                {/* Category selector for uploads */}
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="caption" style={{ minWidth: 140 }}>
                  <option value="">Select category (optional)</option>
                  {PRESET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                {category === "Other" && (
                  <input className="caption" placeholder="Custom category" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} />
                )}

                <button className="btn" onClick={handleUpload} style={{ opacity: file ? 1 : 0.6, pointerEvents: file ? "auto" : "none" }}>Upload Meme</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Template generator */}
        <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.03)", padding: 12, borderRadius: 12 }}>
          <h3 style={{ margin: "6px 0 10px 0" }}>Create from Template</h3>

          <div style={{ marginBottom: 8 }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="caption" style={{ width: "100%", marginBottom: 8 }}>
              <option value="">Filter templates by category</option>
              {Array.from(new Set([...(templates.map(t => t.category || "Uncategorized")), ...PRESET_CATEGORIES])).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="template-list">
            {templates.filter(t => !category || (t.category ?? "Uncategorized") === category).map((t) => (
              <img
                key={t.id}
                src={t.url}
                className={`template-thumb ${selectedTemplate?.id === t.id ? "selected" : ""}`}
                onClick={() => {
                  setSelectedTemplate(t);
                  // set default category to template's category if none selected
                  if (!category && t.category) setCategory(t.category);
                }}
                alt={t.name}
                title={`${t.name}${t.category ? ` — ${t.category}` : ""}`}
              />
            ))}
          </div>

          {selectedTemplate && (
            <div style={{ marginTop: 10 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>{selectedTemplate.name}</strong>
                <div style={{ color: "var(--muted)", fontSize: 12 }}>{selectedTemplate.category ?? "Uncategorized"}</div>
              </div>

              <canvas ref={canvasRef} style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }} />

              <input className="caption" placeholder="Top text" value={topText} onChange={(e) => setTopText(e.target.value)} style={{ marginTop: 8 }} />
              <input className="caption" placeholder="Bottom text" value={bottomText} onChange={(e) => setBottomText(e.target.value)} style={{ marginTop: 8 }} />

              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button className="btn" onClick={() => { setTopText(""); setBottomText(""); }}>Clear</button>
                <button className="btn" onClick={uploadGeneratedMeme}>Upload Generated Meme</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Meme Grid */}
      <div className="grid" style={{ marginTop: 20 }}>
        {memes.map((meme) => (
          <div key={meme.id} className="card">
            <img src={meme.url} alt={`meme-${meme.id}`} className="meme-img" />
            <p className="caption-text">{meme.caption}</p>

            <div className="meta">
              <div className="reactions">
                {REACTION_TYPES.map((reaction) => {
                  const emoji = reaction === "heart" ? "❤️" : reaction === "laugh" ? "😂" : reaction === "wow" ? "😮" : "😢";
                  const active = meme.userReaction === reaction;
                  return (
                    <button key={reaction} className={`reaction-btn ${active ? "active" : ""}`} onClick={() => handleReaction(meme.id, reaction)} title={reaction}>
                      <span style={{ fontSize: 16 }}>{emoji}</span>
                      <span className="count">{meme.reactions[reaction]}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{meme.category ?? ""}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(meme.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
