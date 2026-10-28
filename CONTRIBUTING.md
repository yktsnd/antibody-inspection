# Contributing

Use Node.js 24. Follow the build commands in README. Keep runtime imports limited to VS Code and Node built-ins; the VSIX has no installed npm runtime dependencies. Tests use synthetic strings only. Preserve English UI and user documentation.

Treat [requirements](docs/requirements.md) as the product direction and its status table as the current baseline. Do not mark an entire feature complete because a small sub-operation exists. Scientific adapters require license review, provenance, reproducibility metadata, validation against real permitted data and explicit missing/failed/unsupported states. Do not invent antibody assignments or measurements for a demo.

## Checks before a pull request

1. `npm ci`, `npm test`, `npm run check`, `npm run package`.
2. `xvfb-run -a npm run test:electron` on Linux with Xvfb, or `npm run test:electron` with a desktop display. This installs the VSIX into an isolated profile before running smoke checks against the installed extension.
3. Follow README's five-minute tutorial; check Save/reopen and small-window/keyboard usability. Automated DOM and host integration tests cover behavior but do not replace visual inspection.
4. Describe the concrete behavior change, evidence and remaining scope. Use synthetic reproducers in issues and PRs.

## Release process

CI builds and tests every push/PR. On `main` only, the release job downloads the **same tested VSIX**, verifies SHA256SUMS, creates a draft tagged release, uploads the VSIX and checksum, then publishes it. No Marketplace credentials or personal token are needed; only the job-scoped `GITHUB_TOKEN` with `contents: write`.

For a new release, bump `package.json` and the root/package version in `package-lock.json` together, update README's versioned download links, write a changelog entry, and submit a PR. Merge after CI succeeds. The main workflow publishes `v<version>`; verify the public release Assets before reporting success. The release job can be rerun for the same commit without replacing a published asset. A changed runtime/examples/package under an already published version fails and requires a version bump. An existing tag at a different commit without a published release also fails. Draft retry accepts previously uploaded assets only when GitHub reports the exact SHA-256 digest; an unverifiable draft requires explicit cleanup before retry.

The public VSIX and checksum are durable release assets. Actions artifacts are temporary build outputs and are not the user installation route. Keep install instructions linked to public releases.
