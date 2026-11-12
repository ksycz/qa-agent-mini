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
import { ACTION_TEXT, INJECTION_TEXT, startTarget } from '../src/serve-target';
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

  // Step 9c: the bug "decimal-age-accepted" on the REAL page. A correct page refuses 12.5 with the message of the spec.
  it('decimal-age-accepted: 12.5 is added as a ticket on the buggy page and refused on a correct page', async () => {
    for (const [bugs, added] of [[['decimal-age-accepted'], true], [[], false]] as const) {
      const t = await startTarget({ bugs: [...bugs] });
      try {
        await browser.open(t.url);
        await browser.fill('Visitor age', '12.5');
        await browser.click('button', 'Add visitor');
        const page = await browser.snapshot();
        if (added) {
          expect(page).toContain('Visitor 1, age 12.5');
          expect(page).not.toContain('Enter an age from 0 to 120.');
        } else {
          expect(page).not.toContain('Visitor 1');
          expect(page).toContain('Enter an age from 0 to 120.');
        }
      } finally {
        await t.close();
      }
    }
  });

  // Step 6b: the canary sentence is on the page only with inject: 'report', and the agent's snapshot shows it.
  it('shows the canary sentence in the snapshot only when inject is on', async () => {
    const withCanary = await startTarget({ bugs: [], inject: 'report' });
    try {
      await browser.open(withCanary.url);
      const snap = await browser.snapshot();
      expect(snap).toContain(INJECTION_TEXT);
      expect(snap).not.toContain(ACTION_TEXT); // only one canary at a time
    } finally {
      await withCanary.close();
    }
    await browser.open(target.url); // the page of the other tests: no inject
    expect(await browser.snapshot()).not.toContain('CANARY');
  });

  // Step 10a: with inject: 'action' the snapshot shows the action sentence and not the report sentence.
  it('shows the action canary in the snapshot only when inject is action', async () => {
    const withAction = await startTarget({ bugs: [], inject: 'action' });
    try {
      await browser.open(withAction.url);
      const snap = await browser.snapshot();
      expect(snap).toContain(ACTION_TEXT);
      expect(snap).not.toContain(INJECTION_TEXT);
    } finally {
      await withAction.close();
    }
  });
});
