export type Platform = "youtube" | "youtube_shorts" | "tiktok";

export type UrlCheckResult =
  | { ok: true; platform: Platform }
  | { ok: false; reason: "unsupported" | "invalid" };

/**
 * Validates a clip URL and detects its platform.
 * This only checks the URL shape — it does NOT verify the video is
 * actually reachable. That belongs in the (stubbed) analysis pipeline,
 * per the PRD's "never pretend to have watched a video" rule.
 */
export function checkClipUrl(raw: string): UrlCheckResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return { ok: true, platform: "youtube" };
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname.startsWith("/shorts/")) {
      return { ok: true, platform: "youtube_shorts" };
    }
    if (url.pathname === "/watch" && url.searchParams.has("v")) {
      return { ok: true, platform: "youtube" };
    }
    return { ok: false, reason: "unsupported" };
  }

  if (host === "tiktok.com" || host === "vm.tiktok.com") {
    return { ok: true, platform: "tiktok" };
  }

  return { ok: false, reason: "unsupported" };
}

export function platformLabel(platform: Platform): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "youtube_shorts":
      return "YouTube Shorts";
    case "tiktok":
      return "TikTok";
  }
}
