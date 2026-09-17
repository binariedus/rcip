---
title: Release and publication process
description: Validate and publish RCIP with a pinned toolchain, npm trusted publishing, provenance verification, and GitHub Pages acceptance checks.
---
# Releasing RCIP

RCIP uses a guarded GitHub Actions release with npm trusted publishing.
CI and release jobs install the pinned npm 11.16.0 toolchain before reading the
lockfile; older npm versions resolve optional peers differently. A
release tag starts validation. Existing GitHub environment protections apply;
complete any configured maintainer gate without disabling it.

Package readiness does not authorize any of the external actions in this
runbook. Changing repository visibility, configuring npm, merging, tagging,
and publishing each require an explicit release decision.

## One-time setup

1. Confirm that the GitHub repository is owned by `binariedus/rcip` and that
   the npm maintainer `bprac` can manage `@binaried/rcip`.
2. Review the complete Git history for credentials and private material before
   publishing any package version.
3. Keep this repository public for npm provenance. Verify the attestation on
   the new published version; older releases are not retroactively attested.
4. Create a GitHub environment named `npm`. Add a required reviewer and prevent
   self-review when the account setup allows it.
5. In the npm package settings for `@binaried/rcip`, add a GitHub Actions
   trusted publisher with:

   - organization or user: `binariedus`
   - repository: `rcip`
   - workflow filename: `release.yml`
   - environment: `npm`
   - allowed action: `npm publish`

6. Keep the workflow on GitHub-hosted runners and keep `id-token: write`. Do
   not add an npm access token or `NODE_AUTH_TOKEN` secret.
7. After the first trusted publish succeeds, set npm publishing access to
   require two-factor authentication and disallow token-based publishing, then
   revoke any obsolete automation tokens.

The workflow installs npm 11 because trusted publishing currently requires npm
11.5.1 or later and Node.js 22.14.0 or later. No local npm login is required
for the automated release. The public repository enables npm provenance for qualifying trusted publishes.

Official references:

- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [Publishing public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/)
- [Changing GitHub repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)

## Beta release checklist

Use a beta before moving a new major onto `latest`. Prerelease versions are
published under the npm `beta` distribution tag, so ordinary
`npm install @binaried/rcip` consumers remain on the current stable release.

1. Set the same prerelease version in the root and package `package.json`
   files, for example `2.0.0-beta.5`.
2. Complete the validation and review steps in the release checklist below.
3. Create an annotated tag matching the prerelease exactly:

   ```bash
   git tag -a v2.0.0-beta.5 -m "RCIP 2.0.0 beta 5"
   git push origin v2.0.0-beta.5
   ```

4. Approve the protected npm environment deployment and verify that `beta`
   moved while `latest` did not:

   ```bash
   npm view @binaried/rcip dist-tags --json
   npm view @binaried/rcip@beta version
   ```

The release workflow selects `beta` for every SemVer prerelease and `latest`
only for a stable version. Published versions remain immutable; each beta
iteration must use a new version such as `2.0.0-beta.1`.

## Stable release checklist

1. Start from reviewed, clean `main` and confirm CI is green.
2. Remove the prerelease suffix and set the same stable version in the root
   and package `package.json` files.
3. Update `CHANGELOG.md` and any migration or protocol documentation.
4. Run the local release-candidate checks:

   ```bash
   npm ci
   npm run check
   npm run test:e2e
   npm audit --audit-level=high
   npm pack --workspace @binaried/rcip --dry-run
   ```

5. Review the package file list, public exports, dependency audit, browser
   results, and React 18/19 packed-consumer results.
6. Merge the reviewed source through the repository's normal pull-request
   process.
7. Create and push an annotated tag that exactly matches the package version:

   ```bash
   git tag -a v2.0.0 -m "RCIP 2.0.0"
   git push origin v2.0.0
   ```

8. Review the `Publish RCIP` workflow result, then approve the protected `npm`
   environment deployment.
9. Verify the registry result and stable distribution tag:

   ```bash
   npm view @binaried/rcip version
   npm view @binaried/rcip dist-tags --json
   npm view @binaried/rcip@2.0.0 --json
   ```

10. Install the registry package into a fresh application and repeat one
    minimal discovery/render check.

The current maintenance release is `2.0.1`, retaining protocol `1.0` and public
API compatibility. Use the next unused patch version if it is already published.
Publish only after packed-consumer and composed browser checks pass.

## If a release is bad

Published versions are immutable. Prefer a prompt fixed patch and deprecate the
bad version with a clear message. Do not move or recreate a Git tag, overwrite
a published version, or rely on npm unpublish as a normal rollback mechanism.

## Documentation and discovery

`npm run site:build` generates the API contracts, bundle measurements, VitePress
documentation, and deterministic static demo. `npm run test:site` verifies the
production output. Generated pages and build outputs remain ignored.

The Pages workflow publishes merged `main` changes (or an explicit manual dispatch
from `main`) through GitHub Actions to https://binariedus.github.io/rcip/. The
`github-pages` environment allows deployments from `main`; keep that protection
in place. Package publication still runs from release tags.

For initial setup, an organization owner must enable **Member privileges → Pages
creation → Public → Save** in the organization settings. Then enable Pages in the
repository with **GitHub Actions** as its build source. The organization's
**Pages** settings screen manages custom domains; no custom domain is needed for
the `github.io` address. See [GitHub's Pages publication settings](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-publication-of-github-pages-sites-for-your-organization).

After publishing, verify direct document URLs, search, sitemap, social metadata,
and demo confirmation behavior on the public origin:

```bash
RCIP_SITE_URL=https://binariedus.github.io npm run test:site
```

Confirm npm publication using `npm view @binaried/rcip@latest version --prefer-online`
and a fresh package installation. A successful upload can take a few minutes to
appear in the registry, and the npm website may display older metadata while its
cache updates. Report registry availability separately from the public website.

Keep npm/GitHub descriptions, keywords/topics, homepage, README links, and release
notes consistent. Indexing and search rankings are external outcomes; do not claim
they are guaranteed. No credentials, provider calls, or analytics are required by
the static demo.

CI scans Git history using the open-source Gitleaks CLI, downloaded at a pinned
version and verified against its SHA-256 checksum. This preserves scanning without
the license requirement of the organization-oriented wrapper action.
