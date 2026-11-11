import { chromium } from 'playwright';

// What the agent is allowed to do in a browser. Small on purpose.
export interface BrowserPort {
  open(url: string): Promise<void>;
  snapshot(): Promise<string>;
  click(role: string, name: string): Promise<void>;
  fill(label: string, text: string): Promise<void>;
  close(): Promise<void>;
}

const TIMEOUT_MS = 5000;

export async function launchBrowser(): Promise<BrowserPort> {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.QA_AGENT_BROWSER_PATH || undefined,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);
  return {
    open: async (url) => {
      await page.goto(url);
    },
    // Text tree of the page (roles and names): far cheaper than a screenshot or raw HTML.
    snapshot: () => page.locator('body').ariaSnapshot(),
    click: (role, name) => page.getByRole(role as never, { name, exact: true }).click(),
    fill: (label, text) => page.getByLabel(label, { exact: true }).fill(text),
    close: () => browser.close(),
  };
}
