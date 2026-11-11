// STEP 3 DEMO: the agent loop with a FAKE brain and the REAL browser.
//
// Run it with:  npm run loop
//
// What it does: the fake model follows a prepared script (open the page, add a 65-year-old, read the page,
// report the wrong price, say it is finished). The loop and the tools are the real ones from steps 2 and 3.
// Watch the printed lines: you see the loop asking for a tool, running it, and handing the result back.
//
// There is no AI and no API key here. In step 4 we replace the fake with a real model, and the loop does not change.

import { runAgent } from './agent';
import { launchBrowser } from './browser';
import { say, scriptedLlm, toolCall } from './fake-llm';
import { startTarget } from './serve-target';

const target = await startTarget({ bugs: ['senior-discount'] });
const browser = await launchBrowser();

// The prepared answers of the fake model, one per step.
const llm = scriptedLlm([
  toolCall('open_page', { url: target.url }),
  toolCall('fill', { label: 'Visitor age', text: '65' }),
  toolCall('click', { role: 'button', name: 'Add visitor' }),
  toolCall('snapshot', {}),
  toolCall('report_issue', { title: 'Senior price wrong', steps: 'Add age 65', expected: '€10.00', actual: '€15.00' }),
  say('I tested one senior ticket and found 1 issue.'),
]);

try {
  const result = await runAgent({
    llm,
    tools: { browser, allowedHosts: ['127.0.0.1', 'localhost'], maxSnapshotChars: 5000, issues: [] },
    system: 'You are a QA tester.', // the fake model ignores it; a real model would read it
    task: 'Test the page.',
    log: console.log,
  });
  console.log('\nResult:', { ...result, issues: result.issues.length + ' issue(s)' });
} finally {
  await browser.close();
  await target.close();
}
