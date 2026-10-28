# Antibody Inspection

A local VS Code extension for inspecting sequences, manual ranges and observations. **v0.2.0 is an R0 engineering prototype.** It does not yet implement the full antibody research environment described in the [requirements and scope](docs/requirements.md).

**[Download antibody-inspection-0.2.0.vsix](https://github.com/yktsnd/antibody-inspection/releases/download/v0.2.0/antibody-inspection-0.2.0.vsix)** · [Release page and checksum](https://github.com/yktsnd/antibody-inspection/releases/tag/v0.2.0) · [All releases](https://github.com/yktsnd/antibody-inspection/releases)

## Install and open

You need **desktop Visual Studio Code 1.85 or newer**, in a **local window** on your computer. Browser VS Code, WSL, SSH, containers and Codespaces are not supported. Node.js, Python, an account and external analysis tools are **not required to use the extension**. The extension is distributed here as a VSIX; it is not published in the VS Code Marketplace.

1. Download **antibody-inspection-0.2.0.vsix** using the link above. On the release page it is under **Assets**; do not choose **Source code** ZIP/tar.gz.
2. Open VS Code. Open the Command Palette with **Ctrl+Shift+P** (Windows/Linux) or **Cmd+Shift+P** (macOS).
3. Run **Extensions: Install from VSIX...**, select the downloaded file, and accept VS Code's installation prompt. If prompted, reload the window.
4. Open the Command Palette again and run **Antibody Inspection: Open Workspace**.
5. Click **Try synthetic example**. You should see three sequence entries on the left and the selected sequence in the main panel. No file preparation or network access is needed for this example.

Optional command-line installation, if the `code` command is available:

```sh
code --install-extension antibody-inspection-0.2.0.vsix
```

## First inspection: five minutes

The built-in example contains artificial teaching strings, **not real antibodies**. Their names begin with `SYNTHETIC`. These demonstrate software behavior only.

1. Select **SYNTHETIC_B** in the sequence list. Choose **SYNTHETIC_A** as the reference and click **Align with selected sequence**. The top row is the reference and the bottom row is the selected sequence. Click the insertion column: the detail line should show **reference input position gap · selected input position 11**.
2. Set a manual range: **Type: other**, **Start: 5**, **End: 10**, **Definition or source: teaching range only**. Click **Add range**. Click its coordinate bar or range button. Positions 5–10 are highlighted. These are 1-based inclusive input positions, not antibody numbering.
3. Type an observation, for example `Inspect the inserted residue`. Notes enter the project as you type; there is no Apply step.
4. Click **Save**, choose a local `.json` filename, and wait for **Saved project**. Selection, reference, selected manual range, notes, original FASTA and normalized sequences are retained.
5. Close the tab, run **Antibody Inspection: Open Workspace**, click **Open project**, and choose the saved JSON. Your selected sequence and range should return. Select **SYNTHETIC_A_COPY** to see the exact-duplicate input check.

**Save before closing the inspection tab or VS Code. Unsaved projects are not recovered.** Re-running Open Workspace while the tab is open brings that tab forward. Importing another file or opening a different project asks before discarding unsaved changes.

For your own data, click **Import FASTA** and choose a local UTF-8 `.fasta`, `.fa`, `.faa` or `.txt` file. See the [user guide](docs/user-guide.md) for the accepted format, bounds and troubleshooting.

## What this version does

| Available now | Not implemented |
| --- | --- |
| FASTA import; original text and normalized sequence retention | CSV/TSV/AIRR import, nucleotide translation, chain pairing |
| Input checks for duplicates, ambiguous letters, gaps, stops and alphabet ambiguity | Antibody identification, numbering, automatic CDR/FR assignments |
| Generic pairwise global alignment; clickable original-position mapping | Antibody-aware or multiple-sequence alignment |
| Manual ranges with definition/source text and linked coordinate bars | Molecular topology, domain inference, Fab/Fv/Fc maps, 3D structures |
| Per-sequence notes; JSON project save/reopen; selected record/range/reference | TAP/developability, germline/humanness, experimental/source evidence models, full saved views |

A coordinate bar shows a manual sequence range. It is not a molecular structure. CDR and FR are optional labels supplied by the researcher; choosing one does not validate its boundaries. Sequence alone is not used to infer antigen specificity, species, assembly or clinical properties. Read the [full scope matrix](docs/requirements.md) before planning scientific use.

## Privacy and files

The extension processes selected local files and the bundled synthetic example. It implements no network requests or telemetry. Its JSON projects contain the original sequence data and notes in plain text; store and share them accordingly. VS Code's own services and other installed extensions have their own behavior. The extension blocks remote VS Code windows.

Imports and saved JSON projects are limited to **10 MiB**; the saved project includes both original and normalized input, so large FASTA inputs may be rejected before import. Sequence rendering shows the first **10,000 characters** while retaining the complete input. Alignment requires **ungapped A–Z strings** and at most **2,000,000 dynamic-programming cells**, counting the extra boundary row/column.

## Development and contributions

To build from source, use **Node.js 24** and npm:

```sh
git clone https://github.com/yktsnd/antibody-inspection.git
cd antibody-inspection
npm ci
npm test
npm run check
npm run package
```

This creates `antibody-inspection-0.2.0.vsix` in the repository root. You can install it using the steps above. To debug source, open this repository in VS Code and press **F5**, then run the command in the Extension Development Host.

`npm run test:electron` installs the packaged VSIX into an isolated profile and tests activation, command registration, bundled example presence and webview opening in VS Code **1.85.2**. It requires a display and downloads that VS Code test runtime on first use. On Linux: `xvfb-run -a npm run test:electron`. Run `npm run package` first. CI runs all checks before release publication. The scripted smoke test does not verify every visual interaction or scientific correctness; the unit/integration suite covers the walkthrough, note persistence and coordinate mapping.

See [contributing and release process](CONTRIBUTING.md), [project format](docs/project-format.md), and [requirements](docs/requirements.md). No private sequence data should be committed to issues, fixtures or screenshots. Use synthetic reproducers.

## License

Apache License 2.0 for this repository's original code. Third-party engines, models and reference datasets are not bundled. Their scientific validity and redistribution terms must be assessed before integration. Research software; not a diagnostic device.
