# User guide for v0.2.0

Start with the [download, installation and five-minute tutorial](../README.md). This guide is for the shipped R0 prototype; the planned full research environment is described separately in [requirements](requirements.md).

## Files and positions

FASTA input needs a non-empty `>` header before every non-empty sequence. Multiple records and duplicate names are allowed; each record gets a distinct ID. Blank lines are ignored, sequence whitespace is removed, and letters are uppercased. The original UTF-8 text is retained verbatim. Accepted sequence characters are `A–Z`, `*`, `-` and `.`. Acceptance is a syntax check, not proof that the sequence is an antibody or even an amino-acid sequence.

```text
>example_one
ACDEFGHIKLMN
>example_two
ACDEAFGHIKLMN
```

All displayed positions count characters in the normalized input, beginning at 1, including any gap or stop characters. Ranges include both endpoints. Antibody numbering schemes such as IMGT are not assigned. The sequence view includes a row-start ruler and ten-character groups. Only the first 10,000 characters are drawn; full input remains in the project.

The 10 MiB limit applies to the input file and to the complete saved JSON, including the original text, normalized sequences and annotations. An input below 10 MiB can therefore still be too large to import. Rejected imports leave the existing project in place. Use a smaller collection if the combined limit is exceeded.

## Manual ranges and terms

Click a residue to put its input position in Start and End, or enter both positions. Choose a type and describe the definition or source. Click Add range. Overlapping annotations occupy separate coordinate-map rows. Selecting a bar or range button highlights the same positions in the sequence and reports the definition below it. These annotations are marked as user evidence, not computation.

CDR means complementarity-determining region; FR means framework region. Different scientific definitions can assign different boundaries. This release stores your label and free-text definition; it does not check a scheme, calculate boundaries, recognize a domain or establish a molecular assembly. Use **other** for teaching or arbitrary observation ranges. Remove deletes only the selected annotation, not sequence characters.

## Alignment

Select the sequence to inspect in the left list, choose a Reference, and click Align with selected sequence. This is Needleman–Wunsch global alignment with match +1, mismatch −1, gap −1 and deterministic traceback. It compares letter strings; it does not apply substitution matrices, affine gaps or antibody numbering. Equally optimal alternatives are not enumerated.

The top row is the reference. The bottom row is the selected sequence. A vertical bar indicates matching characters; an underline marks a differing column. Scroll horizontally for long alignments. Click any column to read the two original input positions. An inserted alignment gap has no input position. Clicking a query residue highlights its original sequence character; clicking a query gap clears the residue highlight. Alignment columns are display coordinates, not residue IDs.

Input must consist only of A–Z, without `-`, `.`, `*` or empty strings. At most `(reference length + 1) × (selected length + 1) = 2,000,000` cells are allowed. Split long sequences into scientifically justified smaller inputs outside this prototype; the extension does not crop them automatically. Switching records or editing ranges clears the displayed alignment; rerun Align. Reference selection is saved, but computed alignment output is not stored in the project.

## Notes, saving and reopening

Notes enter the in-memory project as you type. Save writes the project JSON; Save as chooses a different path. A bullet in the tab title and Unsaved changes status indicate work to save. Save before closing; there is no autosave, recovery, undo history or close confirmation. If you cancel a Save dialog, changes remain unsaved.

Open project restores notes, user ranges and the selected record, annotation and reference. It does not run new analysis. The original version-1 JSON projects from v0.1.0 can still be opened; projects without a saved view start at their first record. Unknown formats and internally inconsistent source/sequence data are rejected.

## Troubleshooting

| Problem | Action |
| --- | --- |
| Cannot find the VSIX | Open the [v0.2.0 release](https://github.com/yktsnd/antibody-inspection/releases/tag/v0.2.0), expand Assets, download `antibody-inspection-0.2.0.vsix`. Source ZIP is not installable. |
| Command is missing | Confirm Antibody Inspection is installed and enabled, then reload the VS Code window. Check that you installed into the same VS Code profile. |
| Local-window error | Open a desktop local window with File → New Window, outside SSH/WSL/container/Codespaces sessions. |
| Install says incompatible | Use desktop VS Code 1.85 or newer. Browser VS Code is unsupported. |
| Invalid UTF-8 or FASTA | Save plain UTF-8; add `>` headers; remove numbers and punctuation other than `*`, `-`, `.` from sequence lines. |
| Project too large | Reduce the collection; original and normalized text both contribute to 10 MiB. |
| Cannot align | Check for gaps/stops and the two-million-cell bound. The quality check reports them but does not remove them. |
| Import seems to do nothing | The file picker or discard-changes confirmation may have been cancelled. Current data remain intact. |
| Observation disappeared after closing | Only saved JSON is retained. Unsaved tabs have no recovery. |

Report software defects via [GitHub issues](https://github.com/yktsnd/antibody-inspection/issues) with VS Code version, extension version, steps and a small synthetic input. Do not post proprietary or personal sequence data.
