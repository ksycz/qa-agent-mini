// STEP 2 DEMO: use the agent's tools BY HAND, without any AI.
//
// Run it with:  npm run hands
//
// What it does: starts the demo page (with all bugs on), opens it in a real browser, and calls the tools
// one after another, exactly the way the agent will call them later. The last three calls are SUPPOSED to
// fail, to show what errors look like.
//
// The big idea: an agent is just "a model that chooses which of these calls to make next".
// If these calls work, the only missing piece is the chooser. That is step 3.

import { launchBrowser } from './browser';
import { startTarget } from './serve-target';
import { runTool, type ToolContext } from './tools';

// Start the demo page with all three bugs switched on, and a real browser.
const target = await startTarget({ bugs: ['senior-discount', 'group-threshold', 'limit-off-by-one'] });
const browser = await launchBrowser();

// Everything the tools need. Only these two hosts may be opened.
const ctx: ToolContext = { browser, allowedHosts: ['127.0.0.1', 'localhost'], maxSnapshotChars: 5000, issues: [] };

// Calls one tool and prints what happened. Success prints the result; failure prints "ERROR: ...".
// In step 3 the agent loop will do the same, but it will send the text to the model.
async function call(name: string, input: Record<string, unknown>) {
  console.log(`\n> ${name} ${JSON.stringify(input)}`);
  try {
    console.log(await runTool(ctx, name, input));
  } catch (e) {
    console.log('ERROR:', e instanceof Error ? e.message : e);
  }
}

try {
  // A normal session: open the page, add a 65-year-old visitor, look at the result.
  await call('open_page', { url: target.url });
  await call('fill', { label: 'Visitor age', text: '65' });
  await call('click', { role: 'button', name: 'Add visitor' });
  await call('snapshot', {}); // the page as text: look for the price of the 65-year-old

  // Calls that must FAIL:
  await call('open_page', { url: 'https://example.com' }); // a host that is not allowed
  await call('click', { role: 'button', name: 'Does not exist' }); // missing element: fails after 5 seconds, no hanging

  // Report what we saw. With the senior bug on, the price is €15 and the spec says €10.
  await call('report_issue', { title: 'Senior price wrong', steps: 'Add age 65', expected: '€10.00', actual: '€15.00' });
  console.log('\nIssues collected:', ctx.issues);
} finally {
  // Always clean up, even if something above failed.
  await browser.close();
  await target.close();
}
