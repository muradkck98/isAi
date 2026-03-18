/**
 * Social Media Post Fetcher
 * Supports: Twitter/X (oEmbed), TikTok (oEmbed), Instagram & Facebook (OG tags)
 */

import type { SocialPlatform, SocialPostMeta } from '../types';

const TIMEOUT_MS = 10_000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timer);
    return res;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function extractOGMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i'),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return decodeHTMLEntities(m[1]);
  }
  return null;
}

// ─── Platform detection ───────────────────────────────────────────────────────

export function detectPlatform(url: string): SocialPlatform {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const { hostname } = new URL(normalized);
    if (hostname.includes('instagram.com')) return 'instagram';
    if (
      hostname.includes('twitter.com') ||
      hostname.includes('x.com') ||
      hostname.includes('t.co')
    )
      return 'twitter';
    if (hostname.includes('tiktok.com')) return 'tiktok';
    if (
      hostname.includes('facebook.com') ||
      hostname.includes('fb.com') ||
      hostname.includes('fb.watch')
    )
      return 'facebook';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function isValidSocialUrl(url: string): boolean {
  try {
    const normalized = url.startsWith('http') ? url : `https://${url}`;
    const parsed = new URL(normalized);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

// ─── Platform fetchers ────────────────────────────────────────────────────────

async function fetchTwitterPost(url: string): Promise<SocialPostMeta> {
  const endpoint = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json&omit_script=1`;
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) throw new Error(`Twitter oEmbed ${res.status}`);
  const data: Record<string, unknown> = await res.json();

  const html = typeof data.html === 'string' ? data.html : '';
  const captionMatch = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const caption = captionMatch
    ? captionMatch[1].replace(/<[^>]+>/g, '').trim()
    : null;

  return {
    platform: 'twitter',
    postUrl: url,
    thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
    authorName: typeof data.author_name === 'string' ? data.author_name : null,
    caption,
  };
}

async function fetchTikTokPost(url: string): Promise<SocialPostMeta> {
  const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
  const res = await fetchWithTimeout(endpoint);
  if (!res.ok) throw new Error(`TikTok oEmbed ${res.status}`);
  const data: Record<string, unknown> = await res.json();

  return {
    platform: 'tiktok',
    postUrl: url,
    thumbnailUrl: typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null,
    authorName: typeof data.author_name === 'string' ? data.author_name : null,
    caption: typeof data.title === 'string' ? data.title : null,
  };
}

async function fetchOGPost(url: string, platform: SocialPlatform): Promise<SocialPostMeta> {
  const res = await fetchWithTimeout(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (compatible; Twitterbot/1.0)',
    },
  });
  if (!res.ok) throw new Error(`OG fetch ${res.status}`);
  const html = await res.text();

  return {
    platform,
    postUrl: url,
    thumbnailUrl: extractOGMeta(html, 'og:image'),
    authorName: extractOGMeta(html, 'og:title'),
    caption: extractOGMeta(html, 'og:description'),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchSocialPost(url: string): Promise<SocialPostMeta> {
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  const platform = detectPlatform(normalized);

  switch (platform) {
    case 'twitter':
      return fetchTwitterPost(normalized);
    case 'tiktok':
      return fetchTikTokPost(normalized);
    case 'instagram':
    case 'facebook':
      return fetchOGPost(normalized, platform);
    default:
      return fetchOGPost(normalized, 'unknown');
  }
}
