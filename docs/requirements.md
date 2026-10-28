# Product requirements and shipped scope

The intended product is an English-language, offline desktop VS Code environment for researcher-led antibody inspection. Researchers should move between molecular composition, sequence numbering/CDRs, alignment, structure, developability distributions, experimental conditions and source evidence while preserving the selected molecule/region and saved observation state. Automation prepares data and mappings; the researcher decides what to observe and how to interpret it.

**v0.2.0 is R0, an engineering prototype. R1 is not complete.** Installation and a synthetic demonstration do not establish scientific validity. The product direction below remains in force; it was not reduced to match this implementation. Full original [v1.0 requirements](specification/requirements.original.ja.md), the [59-feature catalog](specification/feature-catalog.json), [concept dictionary](specification/concepts.json) and [source registry](specification/sources.json) are preserved in this repository. These are design sources, not runtime capabilities.

## Required research experience

1. Import sequence and structure inputs while preserving originals, stable sequence identity, molecular grouping, chain copies and missing information.
2. Inspect a molecule through linked Map, Sequence, Structure, Distributions and Evidence views in one principal workspace. Changing views preserves target context. Hover is transient; select, focus and pin have separate meanings.
3. Explain terminology through actual parts, domains, regions, interfaces and relationships. A Fab spans heavy/light chain regions; it cannot be treated as one mutually exclusive flat tag. Draw topology from actual connectivity, distinguish schematics from 3D coordinates and avoid applying IgG geometry to arbitrary formats.
4. Reach original evidence and conditions; distinguish experimental, computed, inferred, curated, user and synthetic information. Missing, not calculated, unsupported and failed are distinct states. Conflicting evidence is retained.
5. Save selection, comparison conditions, camera/layout where applicable, observations and data revisions, then resume reproducibly.

## Scientific contracts for future work

- Keep construct, chain, immutable sequence version, domain, binding unit, antigen, specimen/lot, structure and source distinct. Repeated sequence or assay values do not justify silently merging constructs or specimens.
- Keep antibody numbering scheme, numeric position and insertion code separate; CDR definition is another explicit ID. Use 0-based half-open internal intervals in the target data model and 1-based input positions in displays. Preserve structure author/label chain and residue IDs, assembly copies and missing residues. R0's older JSON format uses 1-based inclusive ranges; it must be migrated explicitly rather than relabelled.
- Record method, version, parameters, units, input/reference/model digests and preprocessing for computations. Sequence changes create a new identity and stale prior results; visual changes do not trigger recomputation.
- TAP comparisons require fixed protocol and reference-pack versions and compatible definitions/conditions. Classify comparisons exact, contextual or incompatible. Do not overlay incompatible values, average multiple Fvs into a whole-molecule score, treat missing metrics as zero, or invent an overall biological risk score. Percentiles derive from numeric ranks rather than histogram bins.
- Separate experimental and predicted structures and quality meanings. Preserve fit/evaluation regions for superposition. Contacts need a stated operational threshold (design default: minimum heavy-atom distance ≤4.5 Å), not an assertion of binding. SASA and interface areas require explicit method, probe and assembly conventions; ΔSASA and ΔSASA/2 have different labels.
- Measurements retain specimen, antigen, endpoint, unit, conditions, replicate and detection-limit operator. KD, EC50, kon and koff cannot be silently interconverted. Unknown conditions remain unknown; source tables/files stay reachable.
- Integrate local scientific engines only after license/distribution review and validation against permitted real data. Engine/model dependencies and missing resources need actionable diagnostics. Synthetic results must never enter real reference populations.

## Feature-by-feature status in v0.2.0

**Partial** means only the listed operation exists; it does not satisfy the full catalog acceptance condition. **Absent** means no usable implementation. No full R1 feature is claimed complete. This table covers all 59 catalog IDs, including later-stage work.

| ID | Requirement | Shipped status and gap |
| --- | --- | --- |
| I01 | FASTA, CSV/TSV and pasted input | Partial: FASTA only; original retained. No column mapping or paste/CSV import. |
| I02 | Nucleotide/AA identification and translation mapping | Partial: alphabet ambiguity label only. No typing or translation. |
| I03 | Chain pairing and molecular grouping | Absent. Records are independent sequences. |
| I04 | Duplicates, fragments and unknown residues | Partial: exact duplicates, ambiguous letters, gaps and stops. No fragment/antibody recognition. |
| I05 | AIRR, NGS and clone information | Absent. |
| M01 | Chain/domain/constant-region detection | Absent. Manual range labels are not detection. |
| M02 | Separate isotype, light-chain, format and completeness axes | Absent. Explicitly unassigned. |
| M03 | Fab, scFv, Fc fusion and multiple-Fv topology | Absent. Coordinate bars are not topology. |
| M04 | Visual terminology and semantic zoom | Partial: manual range-to-sequence highlighting, brief CDR/FR explanations. No molecular concept map/zoom. |
| M05 | Glycans, modifications, ADC and fusion parts | Absent. |
| Q01 | Numbering and CDR definitions | Absent. Manual labels/free text do not establish schemes. |
| Q02 | Antibody-numbered alignment | Partial: generic pairwise global alignment with original-position mapping only. |
| Q03 | CDR extraction, length and composition | Absent. |
| Q04 | Germline candidates and origin similarity | Absent. |
| Q05 | Positional frequencies and conservation | Absent. |
| Q06 | Canonical loops and VH/VL orientation | Absent. |
| Q07 | Exact, similarity and region search | Partial: exact duplicate detection only; no search interface. |
| Q08 | Diversity, clustering and phylogeny | Absent. |
| S01 | PDB/mmCIF and chain mapping | Absent. |
| S02 | Structure selection, distance and representation | Absent. |
| S03 | Structure quality/confidence layers | Absent. |
| S04 | Superposition and regional comparison | Absent. |
| S05 | SASA, contacts and disulfides | Absent. |
| S06 | Local Fv/VHH prediction | Absent. |
| S07 | Ensembles, PAE and flexibility | Absent. |
| B01 | Antigen registration and mapping | Absent. |
| B02 | Complex contacts and interfaces | Absent. |
| B03 | Affinity, kinetics and activity import | Absent. |
| B04 | Epitope bins, competition, mutagenesis/HDX | Absent. |
| B05 | Paratope/epitope prediction | Absent. |
| D01 | Theoretical MW, pI, charge and hydrophobicity | Absent. |
| D02 | Chemical liabilities in structural context | Absent. |
| D03 | TAP metrics and versioned histograms | Absent. |
| D04 | Multiple cohorts and comparison contexts | Absent. |
| D05 | Expression/stability/aggregation/non-specificity measurements | Absent. |
| D06 | Aggregation, solubility, viscosity/self-association prediction | Absent. |
| H01 | Humanness and reference comparison | Absent. |
| H02 | MHC-II and immunogenicity-related annotations | Absent. |
| F01 | Fc, hinge and CL observation/number mapping | Absent. |
| F02 | Fc receptor, complement and half-life context | Absent. |
| F03 | Measured glycan, DAR and conjugation sites | Absent. |
| E01 | Constructs versus specimens/lots | Absent. |
| E02 | Units, replicates, limits and conditions | Absent. |
| E03 | Paper, database, patent and file provenance | Partial: original FASTA and manual definition/source text only. No typed source registry. |
| E04 | Compare experimental, computed and annotated evidence | Absent. Only user range evidence exists. |
| K01 | Local versioned reference packs | Absent. |
| K02 | Integrated search, aliases and identifier resolution | Absent. |
| K03 | Known-antibody/literature similarity search | Absent. |
| U01 | Unified hover/select/focus/pin | Partial: range/sequence and alignment-column selections only. No pin/focus event model. |
| U02 | Saved views, history and notes | Partial: JSON notes, selected record/range/reference. No history, camera/layout, recovery or full snapshots. |
| U03 | Figure, table, sequence and conditions export | Partial: project JSON only. No scientific export formats. |
| U04 | Keyboard, color, themes and empty states | Partial: standard labelled controls, focus outlines, VS Code theme variables and example-first empty state. No formal accessibility validation. |
| U05 | Progressive visual knowledge presentation | Absent. |
| X01 | Offline installation, update and diagnostics | Partial: self-contained VSIX, offline runtime and local-window guard. Download needs network; no scientific engines/diagnostic manager. |
| X02 | Background work, cancellation and cache | Absent. Alignment is bounded synchronous work. |
| X03 | Common extension output contracts | Absent. R0 message handling is not the planned engine protocol. |
| X04 | Input and result revision management | Partial: validates original/normalized consistency and immutable imported record IDs. No analysis version/cache model. |
| Z01 | Mutation/humanization proposals and lineage | Absent; optional future design work. |
| Z02 | Docking, MD and de novo integration | Absent; optional future design work. |

## Delivery gates and next implementation slices

R0 release acceptance covers a public installable VSIX, local-only runtime, honest scope, synthetic walkthrough, original-data retention, deterministic bounded comparison, linked manual ranges, note persistence and save/reopen. Automated tests cover these software contracts; installed VS Code smoke checks activation and opening. Newcomer and visual verification are additional checks, not implied by a passing scientific benchmark.

R1 requires substantial new development. Preserve the whole-system model while implementing reviewable slices: (1) construct/chain/domain/source identity and linked topology/terminology with imported annotations; (2) a validated local numbering/CDR adapter and antibody-aware comparison; (3) PDB/mmCIF mapping, a linked structure viewer and quality context; (4) explicit metric/reference-pack compatibility and distributions; (5) specimens, assay conditions, evidence navigation and full saved views. Each slice needs permitted real datasets, licensing checks and stated numerical/interaction acceptance conditions. Order may change after implementation evidence; omission from v0.2.0 is not removal from the requirements.
