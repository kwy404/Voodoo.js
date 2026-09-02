/**
 * Control probe for the Content-Security-Policy tests.
 *
 * A same-origin file, so `script-src 'self'` loads it. It runs in the page's
 * own script context — the one the policy governs — and not in the automation
 * context, where Playwright's `evaluate` bypasses CSP entirely. That
 * distinction is the whole reason this file exists: without it, a test could
 * "prove" the policy while quietly running its probe somewhere the policy does
 * not apply.
 *
 * It answers one question: is this page allowed to turn a string into code?
 * Under the /csp mount the answer must be no. Under /fixtures, where no policy
 * is sent, the answer must be yes — which is what shows the probe is measuring
 * the policy and not simply always failing.
 */
(function () {
  function attempt(label, run) {
    try {
      return { label: label, allowed: true, value: run(), error: null };
    } catch (error) {
      return { label: label, allowed: false, value: null, error: String(error && error.message) };
    }
  }

  window.__evalProbe = [
    attempt('new Function', function () {
      return new Function('return 21 * 2')();
    }),
    attempt('eval', function () {
      // eslint-disable-next-line no-eval
      return (0, eval)('21 * 2');
    }),
  ];
})();
