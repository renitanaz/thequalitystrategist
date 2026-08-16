# Environment facts

Always relevant regardless of what file is being edited, which is exactly
what makes this a fit for @import rather than a path-scoped rule: there's
no glob pattern that captures "every task on this project," so it belongs
inline in CLAUDE.md, kept in its own file so a second document (say, a
deployment runbook) could @import it too without duplicating it.

- UI: https://peakandpack-ui.onrender.com
- API: https://peakandpackshopdemo.onrender.com (separate Render service,
  found by inspecting the compiled UI bundle for hardcoded fetch URLs)
- Test creds: test@peakandpack.com / password123
- Render's free tier cold-starts. Expect a 503 on the first request after
  idle, retry once before treating it as a real failure.
