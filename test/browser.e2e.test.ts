// END-TO-END TEST with a REAL browser.
//
// The other tests use fakes. This one checks that the real pieces work together:
// the demo server, Playwright and the browser tools.
//
// It is SKIPPED by default because it needs a browser installed. Run it with:
//   E2E=1 npm test
// (If you use your own Chrome:  E2E=1 QA_AGENT_BROWSER_PATH="/path/to/chrome" npm test)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, type BrowserPort } from '../src/browser';
import { startTarget } from '../src/serve-target';

// describe.skipIf: run this group only when the environment variable E2E is set.
describe.skipIf(!process.env.E2E)('browser e2e', () => {
  let browser: BrowserPort;
  let target: Awaited<ReturnType<typeof startTarget>>;

  // Before the tests: start the page (with the senior bug) and the browser. After: close both.
  beforeAll(async () => {
    target = await startTarget({ bugs: ['senior-discount'] });
    browser = await launchBrowser();
  });
  afterAll(async () => {
    await browser?.close();
    await target?.close();
  });

  it('shows the senior bug through the snapshot', async () => {
    await browser.open(target.url);
    await browser.fill('Visitor age', '65');
    await browser.click('button', 'Add visitor');
    // The spec says €10.00 for a senior. With the bug on, the page shows €15.00.
    expect(await browser.snapshot()).toContain('€15.00');
  });

  it('Clear order empties the order', async () => {
    await browser.open(target.url);
    await browser.fill('Visitor age', '30');
    await browser.click('button', 'Add visitor');
    await browser.click('button', 'Clear order');
    const page = await browser.snapshot();
    expect(page).toContain('Total: €0.00');
    expect(page).not.toContain('Visitor 1');
  });
});
