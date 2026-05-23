import { createAnthropic } from "@ai-sdk/anthropic";

/**
 * Optional undici proxy for local Anthropic testing (corporate VPN / proxy).
 * Set ANTHROPIC_HTTP_PROXY=http://127.0.0.1:8888 in .env.local
 */
export async function configureUndiciProxy() {
  const proxyUrl = process.env.ANTHROPIC_HTTP_PROXY;
  if (!proxyUrl) return;

  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const CHAT_MODEL = "claude-sonnet-4-6";
