// Step 2 demo: use the agent's tools by hand, without any AI.
// If this works, the only thing missing for an agent is something that decides WHICH tool to call.
import { launchBrowser } from './browser';
import { startTarget } from './serve-target';
import { runTool, type ToolContext } from './tools';

const target = await startTarget({ bugs: ['senior-discount', 'group-threshold', 'limit-off-by-one'] });
const browser = await launchBrowser();
const ctx: ToolContext = { browser, allowedHosts: ['127.0.0.1', 'localhost'], maxSnapshotChars: 5000, issues: [] };

async function call(name: string, input: Record<string, unknown>) {
  console.log(`\n> ${name} ${JSON.stringify(input)}`);
  try {
    console.log(await runTool(ctx, name, input));
  } catch (e) {
    console.log('ERROR:', e instanceof Error ? e.message : e); // the agent will get errors as text, like this
  }
}

try {
  await call('open_page', { url: target.url });
  await call('fill', { label: 'Visitor age', text: '65' });
  await call('click', { role: 'button', name: 'Add visitor' });
  await call('snapshot', {});
  await call('open_page', { url: 'https://example.com' }); // not an allowed host: must fail
  await call('click', { role: 'button', name: 'Does not exist' }); // missing element: must fail, not hang
  await call('report_issue', { title: 'Senior price wrong', steps: 'Add age 65', expected: '€10.00', actual: '€15.00' });
  console.log('\nIssues collected:', ctx.issues);
} finally {
  await browser.close();
  await target.close();
}
