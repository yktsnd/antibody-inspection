'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { publishRelease } = require('../scripts/release');
function fixture(t, options = {}) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.writeFileSync(path.join(directory, 'package.json'), '{"version":"0.2.0"}'); fs.writeFileSync(path.join(directory, 'antibody-inspection-0.2.0.vsix'), 'TEST ONLY');
  fs.writeFileSync(path.join(directory, 'SHA256SUMS'), crypto.createHash('sha256').update('TEST ONLY').digest('hex') + '  antibody-inspection-0.2.0.vsix\n');
  const calls = [], missing = () => { const error = new Error('missing'); error.status = 404; throw error; };
  const release = { id: 1, assets: [], html_url: 'https://example.test/release', ...options.release };
  const github = { rest: { git: { getRef: async () => options.ref ? { data: options.ref } : missing() }, repos: {
    getReleaseByTag: async () => options.release ? { data: release } : missing(), compareCommits: async () => ({ data: { files: options.files || [] } }),
    createRelease: async args => { calls.push(['create', args]); return { data: { ...release, draft: true } }; },
    uploadReleaseAsset: async args => { calls.push(['upload', args.name]); },
    updateRelease: async args => { calls.push(['publish', args]); return { data: release }; },
  } } };
  return { directory, github, context: { repo: { owner: 'owner', repo: 'repo' }, sha: 'HEAD' }, calls };
}
test('publishes a draft with both verified assets before making it visible', async t => {
  const f = fixture(t); const result = await publishRelease(f);
  assert.deepEqual(f.calls.map(c => c[0]), ['create', 'upload', 'upload', 'publish']);
  assert.equal(f.calls[0][1].target_commitish, 'HEAD'); assert.equal(f.calls[0][1].draft, true); assert.equal(result.skipped, false);
});
test('published release is idempotent and immutable', async t => {
  const f = fixture(t, { ref: { object: { type: 'commit', sha: 'HEAD' } }, release: { draft: false, assets: [{ name: 'antibody-inspection-0.2.0.vsix' }, { name: 'SHA256SUMS' }] } });
  assert.equal((await publishRelease(f)).skipped, true); assert.deepEqual(f.calls, []);
});
test('blocks changed runtime under an existing version and mismatched tag', async t => {
  const f = fixture(t, { ref: { object: { type: 'commit', sha: 'OLD' } }, release: { draft: false }, files: [{ filename: 'src/extension.js' }] });
  await assert.rejects(publishRelease(f), /bump package.json/); assert.deepEqual(f.calls, []);
  delete f.github.rest.repos.getReleaseByTag; // Independent tag mismatch case.
  f.github.rest.repos.getReleaseByTag = async () => { const error = new Error('missing'); error.status = 404; throw error; };
  await assert.rejects(publishRelease(f), /Existing tag/);
});
test('checksum mismatch fails before contacting GitHub', async t => {
  const f = fixture(t); fs.writeFileSync(path.join(f.directory, 'SHA256SUMS'), 'wrong');
  await assert.rejects(publishRelease(f), /checksum/); assert.deepEqual(f.calls, []);
});
