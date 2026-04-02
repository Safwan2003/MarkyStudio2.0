import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Pexels Stock Video API — Tier 2 of the 3-tier background system
// Returns HD stock video URLs contextually matched to scene intent + industry
// ---------------------------------------------------------------------------

interface PexelsVideo {
  video_files: Array<{ link: string; quality: string; width: number; height: number }>;
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
  total_results: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const perPage = Math.min(parseInt(searchParams.get("count") ?? "3", 10), 10);

  if (!query?.trim()) {
    return new Response(JSON.stringify({ error: "Missing query parameter ?q=" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "PEXELS_API_KEY not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=landscape&size=large&per_page=${perPage}`;
    const res = await fetch(url, {
      headers: { Authorization: apiKey },
      next: { revalidate: 3600 }, // Cache results 1 hour
    });

    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ error: `Pexels API error ${res.status}: ${body}` }), {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = (await res.json()) as PexelsSearchResponse;
    const videos = (data.videos ?? []).slice(0, perPage);

    // Extract best quality URL for each video (prefer HD, fall back to first available)
    const results = videos.map((v) => {
      const files = v.video_files ?? [];
      const hd = files.find((f) => f.quality === "hd" && f.width >= 1280)
        ?? files.find((f) => f.quality === "hd")
        ?? files.find((f) => f.quality === "sd")
        ?? files[0];
      return hd?.link ?? null;
    }).filter(Boolean) as string[];

    return new Response(JSON.stringify({ urls: results, total: data.total_results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stock-video] Pexels fetch error:", err);
    return new Response(JSON.stringify({ error: "Failed to fetch stock videos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
