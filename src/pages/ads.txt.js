import { adsTxtLine } from "../lib/ads.js";

// Served at /ads.txt.
export function GET() {
  return new Response(adsTxtLine(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
