# Development and release provenance

[Project page](../README.en.md)

## Release provenance


The [GitHub Actions workflow](../.github/workflows/validate.yml) validates metadata, installs locked dependencies, runs lint and tests, and builds the three standard release files. Successful builds on this repository's `main` branch or version tags then generate GitHub artifact attestations for those exact files. Pull-request validation does not issue attestations. The workflow uploads a `community-release` artifact and does not publish or replace releases automatically.

For a new release, upload the three files from the successful version-tag build's artifact. For an existing release, an attestation covers an attachment only when its SHA-256 matches the attested file; do not assume that a successful workflow attests different manually built files. Attestations establish build provenance, not a security audit or an Obsidian approval.

After downloading release assets, users with GitHub CLI can verify each file, for example:

```sh
gh attestation verify main.js --repo HWMLlv/tech-tree-companion
gh attestation verify manifest.json --repo HWMLlv/tech-tree-companion
gh attestation verify styles.css --repo HWMLlv/tech-tree-companion
```

See [GitHub's artifact attestation documentation](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations).

## Development

Use Node.js **24 LTS** and npm:

```sh
npm ci --ignore-scripts
npm run lint
npm run lint:css
npm test
npm run build
```

The release files are in `dist/`. Commit the source, `manifest.json`, `versions.json`, lockfile, README, license, and notices. Do not commit `dist/` or a generated root `main.js`. See [SUBMISSION.md](../SUBMISSION.md) for the current publication steps and validation boundaries.

CSS validation uses the complete official `stylelint-config-obsidianmd` preset without disabling its rules. Both JavaScript and CSS lint reject warnings in CI. The CSS command intentionally accepts the fixed `styles.css` filename rather than external glob patterns.

As of the 2026-10-16 local audit, `npm audit --omit=dev` reports no known runtime dependency vulnerabilities. The development-only Stylelint chain reports nine affected packages from the single unpatched `braces` advisory [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). This is not a clean all-dependencies audit. Do not feed untrusted file patterns to the lint tools; reassess when an upstream fix is available. Stylelint and its dependencies are not bundled into the three plugin release files.
