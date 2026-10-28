import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Nothing for search engines or AI assistants here: the site's own endpoints and the CRM's loan-car forms.
const PRIVATE = ["/api/", "/loan/"];

// AI search and assistant crawlers are named so it's clear they're welcome: ChatGPT search (OAI-SearchBot), ChatGPT
// reading a page for a user (ChatGPT-User), OpenAI training (GPTBot), and the equivalents for Claude, Perplexity,
// Google's Gemini (Google-Extended), Apple Intelligence and Bing / Copilot. Remove a name to opt that crawler out.
const AI_CRAWLERS = [
  "OAI-SearchBot", "ChatGPT-User", "GPTBot",
  "Claude-SearchBot", "Claude-User", "ClaudeBot",
  "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
