# Antibody Inspection

An English-language, local-first VS Code workspace for researchers to inspect antibody information. This repository is an early prototype.

## Current functionality

- Open a local FASTA file and inspect its sequences.
- Save and reopen a local JSON project that retains the original input, annotations and notes.
- Mark sequence ranges manually with a definition or source and select them to highlight corresponding residues. Positions are 1-based and inclusive.
- Preserve multiple entries and show unassigned interpretation explicitly.
- No network access or telemetry is implemented.

## Run

Open this folder in VS Code, press F5 to launch the Extension Development Host, then run **Antibody Inspection: Open Workspace** from the command palette. Select a local FASTA file.

Run `npm test` and `npm run check` with Node.js. No dependencies are required for these checks.

## Roadmap

The intended product links molecular maps, numbering and CDR definitions, alignments, structure views, developability distributions, experimental conditions, sources and saved observations. These features are not implemented yet. Scientific interpretation requires separately validated engines and reference data with compatible licenses. Sequence alone cannot reliably establish antigen specificity, original species or full molecular assembly.

## Privacy and scope

This prototype reads only the file selected by the user. Use Save to persist data; unsaved changes will be lost if the view is closed. Remote VS Code windows are blocked. It is research software, not a diagnostic device.

## License

Apache License 2.0, applying to the original code in this repository. Third-party engines and reference datasets are not included and must be assessed separately.
