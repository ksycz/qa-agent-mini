// THE BROWSER, as the agent sees it.
//
// Playwright can do hundreds of things. We give the agent only FIVE, on purpose:
// a small set of actions is easier to explain to a model, easier to test and safer.
//
// This file has two parts:
//   1. `BrowserPort`: a list of what the agent may do (an "interface" = a contract).
//   2. `launchBrowser()`: the real implementation, using Playwright and Chrome.
// Tests use a FAKE implementation of the same contract, so they run without any browser.

import { chromium } from 'playwright';

// The contract. Anything that has these five functions can serve as the agent's browser.
export interface BrowserPort {
  open(url: string): Promise<void>; // go to a web address
  snapshot(): Promise<string>; // describe the current page as text
  click(role: string, name: string): Promise<void>; // click, for example role "button", name "Add visitor"
  fill(label: string, text: string): Promise<void>; // type into a field found by its label
  close(): Promise<void>; // close the browser
}

// If the agent asks for something that is not on the page, we do not wait forever.
// After 5 seconds Playwright gives up and throws an error, which the agent can read and react to.
const TIMEOUT_MS = 5000;

// Starts a real Chrome and returns it wrapped in the contract above.
export async function launchBrowser(): Promise<BrowserPort> {
  const browser = await chromium.launch({
    headless: true, // no visible window
    // Optional: use a Chrome you already have instead of the one Playwright downloads.
    // Set the environment variable QA_AGENT_BROWSER_PATH to its path. Empty = use Playwright's own.
    executablePath: process.env.QA_AGENT_BROWSER_PATH || undefined,
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(TIMEOUT_MS);

  return {
    open: async (url) => {
      await page.goto(url);
    },

    // The page as a TEXT TREE of roles and names, for example:
    //   - button "Add visitor"
    //   - paragraph: Total: €10.00
    // The model cannot see pixels, it reads text. This is far cheaper (fewer tokens) than a screenshot
    // or the raw HTML, and it shows exactly what a user or a screen reader can perceive.
    snapshot: () => page.locator('body').ariaSnapshot(),

    // Find an element by what it IS (role) and what it is CALLED (name), like a person would
    // describe it. `exact: true` avoids clicking a wrong element with a similar name.
    click: (role, name) => page.getByRole(role as never, { name, exact: true }).click(),

    // Find an input by its label (the text next to it) and type into it.
    fill: (label, text) => page.getByLabel(label, { exact: true }).fill(text),

    close: () => browser.close(),
  };
}
