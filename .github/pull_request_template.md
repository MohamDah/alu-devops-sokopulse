## Summary

What does this PR change and why?

## Linked issue

Closes #

## Checklist

- [ ] `npm run lint` passes locally
- [ ] `npm test` passes locally
- [ ] `docker build -t sokopulse:ci .` succeeds (if the Dockerfile or dependencies changed)
- [ ] CI is green on this PR
- [ ] Tests added or updated for changed behavior
- [ ] No secrets, `.env` files, or real phone numbers committed
- [ ] Each service under `src/services/` still avoids importing another service's internals
- [ ] README updated if behavior or setup changed
