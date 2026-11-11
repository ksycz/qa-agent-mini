import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { launchBrowser, type BrowserPort } from '../src/browser';
import { startTarget } from '../src/serve-target';

// Real browser test. Run with: E2E=1 npm test
describe.skipIf(!process.env.E2E)('browser e2e', () => {
  let browser: BrowserPort;
  let target: Awaited<ReturnType<typeof startTarget>>;
  beforeAll(async () => { target = await startTarget({ bugs: ['senior-discount'] }); browser = await launchBrowser(); });
  afterAll(async () => { await browser?.close(); await target?.close(); });

  it('shows the senior bug through the snapshot', async () => {
    await browser.open(target.url);
    await browser.fill('Visitor age', '65');
    await browser.click('button', 'Add visitor');
    expect(await browser.snapshot()).toContain('€15.00');
  });
});
