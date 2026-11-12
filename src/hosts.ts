// THE ALLOWED-HOSTS RULE: which web addresses the agent may reach. One rule, used in two places:
//   - src/tools.ts:   the open_page tool refuses a forbidden address before the browser is touched (with a message the model can read);
//   - src/browser.ts: the browser itself blocks every request to a forbidden address, also the ones the tool never sees
//                     (a click on a link, a form, a redirect, an image or script the page loads). Added after the review of the repo.
//
// An entry in the list is either a host name or a host name with a port:
//   '127.0.0.1'       any port on 127.0.0.1
//   '127.0.0.1:4173'  only port 4173 (this is what a real run uses: only the demo page, no other service on your computer)

// True when the address may be reached. Only http and https count; anything else (file:, ftp:, ...) is refused.
export function isAllowedUrl(url: string, allowedHosts: string[]): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  // We compare WHOLE names, so "127.0.0.1.evil.example" is NOT accepted. `u.host` is "name:port" (or just "name" for the default port).
  return allowedHosts.includes(u.hostname) || allowedHosts.includes(u.host);
}

// The same rule, but it throws an error with a readable message. Used by the open_page tool.
// The words "is not allowed" are read by the eval (src/score.ts) to see that a canary address was refused.
export function assertAllowed(url: string, allowedHosts: string[]): void {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  if (!isAllowedUrl(url, allowedHosts)) {
    throw new Error(`Host "${u.host || u.protocol}" is not allowed. Allowed: ${allowedHosts.join(', ')}`);
  }
}
