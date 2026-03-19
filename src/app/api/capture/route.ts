import puppeteer, { type Page } from "puppeteer";

interface Interaction {
  type: "click" | "scroll" | "hover" | "wait";
  /** CSS selector for click/hover targets */
  selector?: string;
  /** Absolute x coordinate (viewport pixels) for click without selector */
  x?: number;
  /** Absolute y coordinate (viewport pixels) for click without selector */
  y?: number;
  /** Scroll amount in pixels (positive = down) */
  scrollY?: number;
  /** Milliseconds to wait (for "wait" type) */
  ms?: number;
}

interface CaptureRequest {
  url: string;
  /** Viewport width — defaults to 1280 */
  width?: number;
  /** Viewport height — defaults to 720 */
  height?: number;
  /** Ordered list of interactions to perform before/between screenshots */
  interactions?: Interaction[];
  /** Take a screenshot after each interaction (true) or only at the end (false, default) */
  captureAfterEach?: boolean;
}

interface CaptureResponse {
  /** Base64-encoded JPEG screenshots */
  frameImages: string[];
}

const TIMEOUT_MS = 20_000;
const MAX_SCREENSHOTS = 10;
const SCREENSHOT_QUALITY = 82; // JPEG quality — same as extractVideoFrames

/**
 * Wait for navigation OR network idle after a click.
 * Races networkidle0 (full page load) against an 800ms fallback (in-page update).
 * The .catch(() => null) ensures a timeout never throws.
 */
async function waitAfterClick(page: Page): Promise<void> {
  await Promise.race([
    page.waitForNavigation({ waitUntil: "networkidle0", timeout: 5000 }).catch(() => null),
    new Promise<void>((r) => setTimeout(r, 800)),
  ]);
}

export async function POST(req: Request) {
  let body: CaptureRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, width = 1280, height = 720, interactions = [], captureAfterEach = false } = body;

  if (!url || typeof url !== "string") {
    return Response.json({ error: "url is required" }, { status: 400 });
  }

  // Basic URL safety check — only allow http/https
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return Response.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height });

    // Navigate to the URL
    await page.goto(url, { waitUntil: "networkidle2", timeout: TIMEOUT_MS });

    const frameImages: string[] = [];

    // Helper: take a JPEG screenshot and push as data URL
    const capture = async () => {
      const shot = await page.screenshot({
        encoding: "base64",
        type: "jpeg",
        quality: SCREENSHOT_QUALITY,
      });
      frameImages.push(`data:image/jpeg;base64,${shot}`);
    };

    // Capture initial state
    await capture();

    // Execute interactions
    for (const action of interactions) {
      if (frameImages.length >= MAX_SCREENSHOTS) break;

      switch (action.type) {
        case "click":
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: 5000 }).catch(() => null);
            await page.click(action.selector).catch(() => null);
          } else if (action.x !== undefined && action.y !== undefined) {
            await page.mouse.click(action.x, action.y);
          }
          // Wait for navigation (full page load) or in-page update to settle
          await waitAfterClick(page);
          break;

        case "hover":
          if (action.selector) {
            await page.waitForSelector(action.selector, { timeout: 5000 }).catch(() => null);
            await page.hover(action.selector).catch(() => null);
          } else if (action.x !== undefined && action.y !== undefined) {
            await page.mouse.move(action.x, action.y);
          }
          // Brief settle for hover animations
          await new Promise((r) => setTimeout(r, 300));
          break;

        case "scroll":
          await page.evaluate((scrollY) => window.scrollBy(0, scrollY ?? 300), action.scrollY ?? 300);
          await new Promise((r) => setTimeout(r, 300));
          break;

        case "wait":
          await new Promise((r) => setTimeout(r, Math.min(action.ms ?? 500, 5000)));
          break;
      }

      if (captureAfterEach) {
        await capture();
      }
    }

    // Always capture final state
    if (!captureAfterEach || interactions.length === 0) {
      if (interactions.length > 0) {
        await capture();
      }
    }

    const response: CaptureResponse = { frameImages };
    return Response.json(response, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Capture failed";
    return Response.json({ error: message }, { status: 500 });
  } finally {
    await browser.close();
  }
}
