---
title: Published-package and public-site health checks
description: Run the same RCIP registry, React consumer, documentation, and demo checks locally or in GitHub Actions, with explicit schedules and expiry.
---
# Public health checks

RCIP's public health checks validate the package users install and the website
they visit. They are automated maintenance checks; their installations are not
independent adoption or user counts.

## Run locally

Use Node 24 and the pinned npm toolchain. Availability checks use only Node's
built-in HTTP client and do not install or download the RCIP package:

```bash
npm run health:availability
npm run health:availability -- --version 2.0.2
```

For regression, first install the development tools and Chromium:

```bash
npx --yes npm@11.16.0 ci
npx playwright install --with-deps chromium
npm run health:regression
npm run health:regression -- --version 2.0.2
```

`latest` is resolved once per run. An exact version verifies that release even if
`latest` later changes. `--wait-seconds 600` permits bounded registry metadata
polling after publication; it does not repeatedly download a missing package.
`--site-url http://127.0.0.1:4186` checks a locally previewed site with the same
`/rcip/` routes. Temporary consumers are removed at the end of each run.

## What is checked

| Lane | Checks |
| --- | --- |
| Availability | npm metadata and distribution identity; documentation, quick start, demo, sitemap, and referenced JavaScript/CSS responses and content types |
| Regression | Fresh registry installation; React 18.2/18.3/19.1 consumers; installed version, ESM/CommonJS imports, typecheck, production build, and browser discovery/read/write/validation/confirmation |
| Public browser | Documentation/search, static demo confirmation and layout changes, and mobile viewport fit |

Each regression run uses a new temporary npm cache shared across its React
consumers. It never substitutes local workspace source for the registry package.
The normal packed-consumer CI lane still validates the locally built candidate.

## GitHub Actions schedule

[RCIP public health](https://github.com/binariedus/rcip/actions/workflows/public-health.yml)
supports manual availability/regression runs. The release workflow invokes its
regression lane for the exact version just published, with up to ten minutes for
registry propagation. Manual and release checks have no seven-day cutoff.

[RCIP seven-day monitoring](https://github.com/binariedus/rcip/actions/workflows/health-week.yml)
adds temporary availability checks at minutes 7, 17, 27, 37, 47, and 57 of each
hour, plus daily regression at 04:23 UTC. Runs use the default branch. GitHub can
delay or drop scheduled jobs; this is not an exact-interval uptime guarantee.

The repository Actions variable `RCIP_HEALTH_UNTIL` holds the UTC ISO expiry.
A missing value leaves scheduled probes inactive; an invalid value fails the
guard. A future value must be no more than seven days ahead. At expiry, no checks
start and an isolated job disables **only** `health-week.yml`. Release and manual
health checks stay available. A running check may finish after expiry.

To activate a new seven-day window after validating the checks:

1. Set `RCIP_HEALTH_UNTIL` in repository **Settings → Secrets and variables →
   Actions → Variables** to a UTC timestamp exactly seven days ahead.
2. Enable the seven-day workflow if it was previously disabled.
3. Run it manually and verify the reported expiry and selected check lane.

To stop early, disable the seven-day workflow. To inspect the guard locally without
network requests or disabling any workflow:

```bash
RCIP_HEALTH_UNTIL=2020-01-01T00:00:00Z node scripts/health-window.mjs
```

Results, versions, URLs, timings, and errors appear in Actions logs and summaries.
Failed jobs use normal GitHub notification settings. No external notifications
are sent. HTTP requests have timeouts and one retry for transient failures;
regression assertions are not automatically rerun to hide failures.

## Runner cost and permissions

These health workflows run only for public repositories, on standard
`ubuntu-latest` runners. They disable persistent Actions caching and upload no
artifacts. Logs and job summaries do not consume artifact storage. Under
[GitHub's current pricing](https://docs.github.com/en/billing/concepts/product-billing/github-actions),
this setup adds no runner, artifact, or cache charges. Existing organization
usage is separate, and pricing can change.

Checks need read-only repository access and no npm, model, or application secrets.
Only the expiry job receives `actions: write`, to disable the temporary workflow.
Local debugging uses the same commands as Actions; temporary browser diagnostics
remain local to the machine or runner and are not uploaded.
