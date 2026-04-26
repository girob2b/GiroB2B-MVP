import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCRAPER_URL = process.env.SCRAPER_URL ?? "http://girob2b-scraper:3002";

/**
 * SSE bridge entre navegador e microsserviço scraper.
 * Encaminha bytes do stream `text/event-stream` verbatim; encerra quando
 * o cliente fecha a conexão ou o scraper fecha o stream.
 * Ver docs/WEB_SCRAPING.md §7.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const upstream = await fetch(`${SCRAPER_URL}/jobs/${encodeURIComponent(jobId)}/stream`, {
    method: "GET",
    headers: { Accept: "text/event-stream" },
    signal: req.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(
      `event: error\ndata: ${JSON.stringify({ message: "upstream_unavailable", status: upstream.status })}\n\n`,
      {
        status: upstream.status === 404 ? 404 : 502,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      }
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
