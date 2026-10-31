# A five-minute tour: Herceptin Fab × HER2

Run **Antibody Inspection: Explore Guided Demo**. All observations below use bundled public data and precomputed results; no Python runtime is needed to explore them. New calculations require the optional local runtime.

## 1. Understand the molecule

The Map shows separately identified heavy chain, light chain and HER2 antigen. Select **Fv** and then **Fab**: the selected ranges change because Fab also includes the first constant domains. These relationships were explicitly supplied for this example; the software did not infer pairing from input order.

## 2. Inspect heavy-chain CDR3

The Sequence view links IMGT numbering to original sequence coordinates. Select a residue or a CDR/FR region. The germline reference table compares amino-acid positions with a fixed reference snapshot and shows identity and coverage independently. V and J candidates are separate comparisons. Identical amino-acid alleles cannot be distinguished by this calculation.

## 3. See the experimental complex

The Structure view displays deposited PDB 1N8Z protein coordinates. Selected CDR3 residues are highlighted. Drag to rotate; scroll over the canvas to zoom. **Focus selection** changes the camera explicitly. Click two atoms to measure their separation in Å. Missing experimental residues are not given fabricated coordinates.

## 4. Compare a local prediction

The comparison overlays a locally computed ImmuneBuilder Fv with experimental coordinates. The recorded fit uses 91 heavy-chain framework Cα pairs; evaluation uses 13 heavy-chain CDR3 pairs. The stored RMSDs are approximately 0.338 Å and 0.814 Å, respectively. Inspect the saved result for exact values and residue lists.

These numbers describe this one example and its chosen mapping. They are not an independent accuracy benchmark or evidence of general predictive performance. The predicted model contains VH and VL only.

## 5. Inspect the local surface profile

The predicted Fv includes a precomputed surface profile. Inspect hydrophobic and charged-residue solvent-exposed areas and connected patches. Click a listed patch residue to locate it in the structure. The calculation uses the Fv chains in isolation, a 1.4 Å solvent probe and an explicitly defined residue-contact graph. It is an independent descriptor, not TAP or a calibrated risk score.

## 6. Inspect the reference conditions

The Distributions view separates sequence properties, OASis human-reference peptide identity and published TAP2 populations. Choose a TAP metric to compare the clinical and natural reference distributions on a shared axis. Their sample sizes remain fixed when the collection is filtered.

The TAP panels contain published population values. There is no candidate TAP score or pass/fail conclusion in this demo. OASis peptide identity is not a clinical immunogenicity assessment.

## 7. Preserve an observation

Open Evidence to inspect sources and add a note. Save a named observation to retain the selected region and view. Choose **Save as** to write your own portable project. Saving does not alter the bundled example.

The exported structure image includes a JSON sidecar with view metadata. An analysis-report export includes input records, results, experimental observations, references and sources; the project itself also retains structure coordinates and saved views.
