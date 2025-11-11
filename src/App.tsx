import { useState, useEffect } from "react";
import type { DragEvent } from "react";
import { createClient } from "@supabase/supabase-js";

// ----------------------
// Initialize Supabase here using .env
// ----------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ----------------------
// Types
// ----------------------
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

  // Get current user session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUserId(data.session.user.id);
    });

    // Optional: subscribe to auth changes
    supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // Fetch memes + reactions
  const fetchMemes = async () => {
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
      const formatted: Meme[] = data.map((m: any) => {
        const reactionsCount: { [key: string]: number } = {
          heart: 0,
          laugh: 0,
          wow: 0,
          sad: 0,
        };
        let userReaction: string | undefined = undefined;

        m.reactions.forEach((r: any) => {
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
  };

  useEffect(() => {
    fetchMemes();
  }, [userId]);

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
  // Handle reactions
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
  };

  // ----------------------
  // Render
  // ----------------------
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center" }}>Meme Board 🤣</h1>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: "2px dashed #ccc",
          borderRadius: "8px",
          padding: "1rem",
          marginBottom: "1rem",
          textAlign: "center",
          backgroundColor: "#fafafa",
          cursor: "pointer",
        }}
      >
        Drag & Drop your meme here
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <input
        type="text"
        placeholder="Add a caption..."
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        style={{ marginLeft: "0.5rem" }}
      />
      <button
        onClick={handleUpload}
        style={{ marginLeft: "0.5rem", padding: "0.3rem 0.8rem" }}
      >
        Upload Meme
      </button>

      <div
        style={{
          marginTop: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "1rem",
        }}
      >
        {memes.map((meme) => (
          <div
            key={meme.id}
            style={{
              border: "1px solid #ccc",
              padding: "0.5rem",
              borderRadius: "8px",
              backgroundColor: "#fff",
            }}
          >
            <img
              src={meme.url}
              alt={`meme-${meme.id}`}
              style={{
                width: "100%",
                borderRadius: "4px",
                marginBottom: "0.5rem",
              }}
            />
            <p>{meme.caption}</p>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {REACTION_TYPES.map((reaction) => (
                <button
                  key={reaction}
                  onClick={() => handleReaction(meme.id, reaction)}
                  style={{
                    padding: "0.2rem 0.5rem",
                    cursor: "pointer",
                    backgroundColor:
                      meme.userReaction === reaction ? "#ffd700" : "white",
                  }}
                >
                  {reaction === "heart"
                    ? "❤️"
                    : reaction === "laugh"
                    ? "😂"
                    : reaction === "wow"
                    ? "😮"
                    : "😢"}{" "}
                  {meme.reactions[reaction]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
