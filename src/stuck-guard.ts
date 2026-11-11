// THE STUCK GUARD: notices when the agent is going round in circles.
//
// A model can get stuck: it asks for the same thing again and again and nothing changes.
// That costs money and never ends well, so our code must notice it. This file holds that one rule.
//
// What "stuck" means here: the SAME call, with the SAME result, and the page looks THE SAME afterwards.
// (Step 3 only compared the calls. That was too strict: clicking "Add visitor" five times is a perfectly
// good test, because the page changes every time. See issue #12.)
//
// We do not stop at the first sign. The model gets ONE warning first, inside the tool result it reads next.
// Only if it keeps repeating in a LATER step, after it had a chance to read the warning, the run is stopped.

// What the loop should do after a tool call:
//   'ok'   = carry on, nothing to see
//   'warn' = carry on, but add the warning to the tool result the model will read
//   'stop' = end the run (the model ignored the warning)
export type StuckVerdict = 'ok' | 'warn' | 'stop';

export const STUCK_WARNING =
  'WARNING: you have made this exact call several times in a row and neither the result nor the page changed. ' +
  'Do something different. If you repeat it again, the run will be stopped.';

export function createStuckGuard(maxRepeated: number) {
  let lastSignature = ''; // what the previous call looked like (see `check`)
  let repeated = 0; // how many times in a row that same signature was seen
  let warnedInStep = 0; // the step in which we warned during this streak (0 = no warning yet)

  return {
    // Call this after EVERY tool call, once the result and the page are known.
    //   step   = which model step we are in (a step can contain several tool calls)
    //   call   = the tool name and its arguments, as text
    //   result = the text the tool returned (or the error message)
    //   page   = the text of the page AFTER the call (a snapshot)
    check(step: number, call: string, result: string, page: string): StuckVerdict {
      // Two calls are "the same" only if all three parts are equal. The \u0000 character cannot appear
      // in normal text, so it keeps the three parts apart.
      const signature = [call, result, page].join('\u0000');
      if (signature === lastSignature) {
        repeated++;
      } else {
        lastSignature = signature;
        repeated = 1;
        warnedInStep = 0; // something changed, so the streak (and the warning) starts over
      }

      if (repeated < maxRepeated) return 'ok';
      if (warnedInStep === 0) {
        warnedInStep = step;
        return 'warn';
      }
      // Already warned. If we are still in the SAME step, the model has not seen the warning yet
      // (it sent several calls in one answer), so it would be unfair to stop it now.
      return step > warnedInStep ? 'stop' : 'ok';
    },
  };
}
