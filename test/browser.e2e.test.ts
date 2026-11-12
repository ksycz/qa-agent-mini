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
import { INJECTION_TEXT, startTarget } from '../src/serve-target';
import { runTool, type ToolContext } from '../src/tools';
import { NO_SKILLS } from '../src/skills';

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

  // Step 6e: the tool on the REAL page. It also proves that the alert line looks the way findAlert expects.
  it('add_visitors adds 11 visitors and stops at the page message on the 11th (limit is 10)', async () => {
    const limitTarget = await startTarget({ bugs: [] }); // a page without bugs: the 11th ticket is refused
    try {
      await browser.open(limitTarget.url);
      const ctx: ToolContext = { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 6000, issues: [], skills: NO_SKILLS };
      const out = await runTool(ctx, 'add_visitors', { ages: '30,30,30,30,30,30,30,30,30,30,30' });
      expect(out).toContain('Stopped after age 30 (11 of 11)');
      expect(out).toContain('Maximum 10 tickets per order.');
    } finally {
      await limitTarget.close();
    }
  });

  // Step 9b: the bug "clear-keeps-count" on the REAL page. The same steps on a correct page give the full price.
  it('clear-keeps-count: after 8 tickets and Clear order, one adult gets the group discount (€18.00); on a correct page €20.00', async () => {
    const ages = '30,30,30,30,30,30,30,30';
    const ctx: ToolContext = { browser, allowedHosts: ['127.0.0.1'], maxSnapshotChars: 6000, issues: [], skills: NO_SKILLS };
    for (const [bugs, price] of [[['clear-keeps-count'], '€18.00'], [[], '€20.00']] as const) {
      const t = await startTarget({ bugs: [...bugs] });
      try {
        await browser.open(t.url);
        await runTool(ctx, 'add_visitors', { ages });
        await browser.click('button', 'Clear order');
        await runTool(ctx, 'add_visitors', { ages: '30' });
        expect(await browser.snapshot()).toContain(`Visitor 1, age 30: ${price}`);
      } finally {
        await t.close();
      }
    }
  });

  // Step 6b: the canary sentence is on the page only with inject: true, and the agent's snapshot shows it.
  it('shows the canary sentence in the snapshot only when inject is on', async () => {
    const withCanary = await startTarget({ bugs: [], inject: true });
    try {
      await browser.open(withCanary.url);
      expect(await browser.snapshot()).toContain(INJECTION_TEXT);
    } finally {
      await withCanary.close();
    }
    await browser.open(target.url); // the page of the other tests: no inject
    expect(await browser.snapshot()).not.toContain('CANARY');
  });
});
