'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
async function optional(get) {
  try { return (await get()).data; } catch (error) { if (error.status === 404) return null; throw error; }
}
async function publishRelease({ github, context, directory = process.cwd() }) {
  const { version } = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Release requires a numeric major.minor.patch package version.');
  const repo = context.repo, tag = `v${version}`, names = [`antibody-inspection-${version}.vsix`, 'SHA256SUMS'];
  const assets = names.map(name => ({ name, data: fs.readFileSync(path.join(directory, name)) }));
  const digest = crypto.createHash('sha256').update(assets[0].data).digest('hex');
  if (assets[1].data.toString().trim() !== `${digest}  ${names[0]}`) throw new Error('VSIX checksum does not match SHA256SUMS.');
  const ref = await optional(() => github.rest.git.getRef({ ...repo, ref: `tags/${tag}` }));
  let release = await optional(() => github.rest.repos.getReleaseByTag({ ...repo, tag }));
  if (ref && (ref.object.type !== 'commit' || ref.object.sha !== context.sha)) {
    if (!release || release.draft) throw new Error(`Existing tag ${tag} does not identify this commit; bump package.json version.`);
    const comparison = (await github.rest.repos.compareCommits({ ...repo, base: ref.object.sha, head: context.sha })).data;
    // Never silently reuse a version for changed runtime code or build inputs.
    if (comparison.files?.some(file => /^(src\/|examples\/|package(?:-lock)?\.json$)/.test(file.filename))) throw new Error(`Runtime changed since ${tag}; bump package.json version before releasing.`);
    if (!names.every(name => release.assets.some(asset => asset.name === name))) throw new Error(`Published release ${tag} has missing assets.`);
    return { skipped: true, url: release.html_url };
  }
  if (release && !release.draft) {
    if (!names.every(name => release.assets.some(asset => asset.name === name))) throw new Error(`Published release ${tag} has missing assets.`);
    return { skipped: true, url: release.html_url };
  }
  if (!release) release = (await github.rest.repos.createRelease({ ...repo, tag_name: tag, target_commitish: context.sha, name: `${tag} — R0 sequence inspection prototype`, draft: true, prerelease: false, body: `Install **${names[0]}** from Assets below in desktop VS Code 1.85 or newer.\n\n1. Open the Command Palette and run **Extensions: Install from VSIX...**.\n2. Choose the downloaded VSIX, then run **Antibody Inspection: Open Workspace**.\n3. Select **Try synthetic example** for an offline walkthrough.\n\n[Installation and tutorial](https://github.com/${repo.owner}/${repo.repo}/blob/${tag}/README.md) · [Shipped scope and gaps](https://github.com/${repo.owner}/${repo.repo}/blob/${tag}/docs/requirements.md)\n\nThis is an R0 prototype: FASTA, input checks, generic alignment, manual ranges, notes and saved selection. No automatic antibody numbering/CDR assignment, topology, 3D structure, TAP or experimental evidence. Synthetic examples are not biological validation.\n\nSHA256SUMS covers the VSIX. The build installs and activates this packaged VSIX in an isolated VS Code 1.85.2 profile before publication.` })).data;
  for (const asset of assets) {
    const existing = release.assets.find(item => item.name === asset.name);
    const expectedDigest = 'sha256:' + crypto.createHash('sha256').update(asset.data).digest('hex');
    if (existing) {
      if (existing.digest !== expectedDigest) throw new Error(`Draft asset ${asset.name} cannot be verified; remove the draft release before retrying.`);
      continue;
    }
    await github.rest.repos.uploadReleaseAsset({ ...repo, release_id: release.id, name: asset.name, data: asset.data, headers: { 'content-type': 'application/octet-stream', 'content-length': asset.data.length } });
  }
  release = (await github.rest.repos.updateRelease({ ...repo, release_id: release.id, draft: false, make_latest: 'true' })).data;
  return { skipped: false, url: release.html_url };
}
module.exports = { publishRelease };
