# Getting started with the offline demo

Run **Antibody Inspection: Explore Guided Demo**. Seven precomputed observations require no Python setup. See [the demo guide](demo.md). To analyze new input, prepare the local runtime using the instructions below.

For the SAbBox-free structural alternative, see [local surface profile](surface-profile.md). Select Chain A / B in Structure, then **Calculate surface profile**.

# User guide — 0.4.0

## Input and sequence identity

Import UTF-8 FASTA, CSV or TSV, or paste text. Table columns default to `name`/`id` and `sequence`/`seq`; pasted tables allow explicit column names. Quoted fields, delimiters inside quotes and newlines are supported. The original table and digest are retained alongside canonical FASTA. A sequence containing only nucleotide letters stays unresolved until the researcher chooses DNA/RNA or protein. Duplicate names and sequences remain separate records.

Use `construct_id` and `chain_role` columns, or the Map metadata controls, to group chains explicitly. Row order never establishes pairing. Translation requires an explicit frame (+1/+2/+3/-1/-2/-3) and creates a new protein record with parent ID, standard-code identifier and codon-to-input coordinates. Trailing bases are retained as a count. A stop-containing product must be resolved before antibody analysis.

## Numbering and domains

Analyze sequence runs the selected record; Analyze collection runs unsuccessful/unprocessed records except antigen-role records. Errors remain attached to individual records. ANARCII runs in CPU accuracy mode with IMGT numbering. Internal coordinates are zero-based, half-open; visible input positions are one-based. Domain residue entries retain numeric position and insertion code separately. Numbering display and CDR definition are independent selectors: IMGT or Kabat. Changing the CDR definition changes the selected residue boundaries without changing the displayed numbering scheme. Older saved results need reanalysis to obtain Kabat positions. Germline comparison, prediction preparation and structural fitting continue to use their recorded IMGT definitions.

The Map shows variable and supported human constant-domain matches. Human reference matching requires at least 70% identity and 85% reference coverage and reports alternatives; this is not an assignment of origin species. Fab/Fv buttons combine regions only within explicitly grouped heavy/light chains. General Fc-fusion connectivity and multiple binding-unit pairing are not yet modeled.

Sequence buttons select CDRs/FRs or individual residues. Shift-click extends a range. Pages contain 300 residues; every residue is retained. Manual annotations remain labeled user evidence. Numbered alignment compares the explicitly selected domain index across compatible records; heavy/light classes cannot be mixed. Inspect a position to see residue counts, the non-gap denominator, missing records, entropy and population identities. Gaps are excluded from residue-frequency denominators, exact duplicates retained. Generic pairwise alignment is separately labeled and limited to two million dynamic-programming cells.

## Structures and calculations

Import PDB or mmCIF, or use the bundled experimental 1N8Z example. Only protein heavy atoms are analyzed: waters, ligands, hydrogens and non-A alternate conformers are excluded. The supplied asymmetric unit is the initial structure. Select a deposited biological assembly to create a separate expanded structure using its recorded operators. Each copy retains original author/label identifiers, source coordinates and a distinct instance identity; the original structure is preserved. All parsed model IDs are retained, but the current viewer/calculation controls use model 0.

Automatic chain mapping requires a unique best sequence match with at least 95% identity and coverage of observed residues. Exact duplicate candidate sequences remain ambiguous and are not assigned. Author/label chain and residue IDs and insertion codes remain in the project. Missing residues have no fabricated coordinates.

Cartoon, sticks and lines are available. Click residues to link to the input sequence. Click two atoms to display their distance in angstroms. Drag rotates; the mouse wheel over the molecular canvas zooms. Scroll outside the canvas to reach calculation controls. Focus selection zooms to chosen residues; Show all restores the full structure.

Contacts use minimum protein heavy-atom distance at the selected threshold (default 4.5 angstroms). Contact does not establish binding or identify a paratope. SASA uses Biopython Shrake–Rupley, 300 points/atom, 1.4-angstrom probe and default atomic radii. Protein SASA uses the entire model; the chain-pair interface calculation uses those two chains in isolation. Delta SASA = SASA(A) + SASA(B) - SASA(A+B). Half-delta SASA is reported separately.

Superposition uses matched C-alpha atoms for the selected sequence. Choose fit and evaluation regions independently: IMGT frameworks, all CDRs, CDR3, current selection or all mapped residues. The default fits frameworks and evaluates CDR3. Both region definitions, matched input indices and pair counts are saved. Missing coordinates are excluded. The moving model is displayed in gold. This version does not resolve ambiguous repeated chain copies.

B-factor is not automatically interpreted as pLDDT. Imported structures default to unknown origin and B-factor semantics. Disulfide tables retain source annotations and symmetry; they are not proximity-based bond predictions.

### Local Fv / VHH prediction

Analyze the input chains first and assign the same explicit construct ID to the heavy and light chain. Open **Structure → Local variable-domain prediction**, choose **Fv** or **VHH**, then **Prepare models**. This installs optional dependencies and downloads four official model files (~704 MB per format). Interrupted downloads resume when supported; each file is checked against its official checksum before activation. **Predict locally** runs the four-model ensemble and OpenMM refinement on CPU. Cancel stops the worker; saved inputs remain available.

The result contains only the selected variable domains. Constant regions, linkers and antigen are excluded. Input preparation uses ANARCII IMGT domains, which is recorded as an adaptation of the original ImmuneBuilder pipeline. Each predicted residue maps back to an original input position. The structure provenance records model digests and whether refinement succeeded; failed refinement is explicitly labeled. The B column holds ensemble RMS coordinate dispersion in angstroms, not pLDDT. It is not an independent validation of structural accuracy.

## Properties, reference packs and experiments

MW is average mass for the whole reduced, unmodified chain with free termini; pI and charge are Biopython estimates; charge uses pH 7.4. Unsupported residues produce not-evaluable values. Motif hits identify sequence patterns, not measured reaction rates. Working-cohort histograms include all analyzed records and do not change with the collection search filter.

Reference JSON requires `id`, `version`, `source`, `license`, `protocol`, `unit`, `metric`, `denominator`, `exclusions`, `duplicateRule` and numeric-or-null `values`. Synthetic packs are rejected. Select a reference metric to compare its populations on a common x-axis (only for matching units); bar heights are scaled within each population. Candidate overlays and full TAP comparisons remain unavailable.

**Load published TAP populations** imports the five numeric metrics from the 2024 TAP2 paper for 664 clinical and 79,759 natural paired Fvs. The workbook digest and source sheet/column/rows are retained. These are the published complete populations, not repeated-run or confidence-filtered subsets. Official candidate TAP values are not computed. Use the independent local surface profile for exposed hydrophobic/charged-residue areas and connected patches; these values are never overlaid onto TAP distributions.

**Evaluate OASis peptide identity** compares overlapping 9-mers within each numbered variable domain to the promb human OAS reference (present in at least 10% of reference subjects). Repeated peptide windows remain in the denominator. Unmatched windows link back to the sequence; reference version, count and digest are saved. This reports peptide similarity, not species, ancestry, gene assignment or immunogenicity.

Measurement CSV/TSV requires `sequence_id,specimen_id,endpoint,value,unit,source`. `sequence_id` must be a unique record ID or unique display name. Optional fields: antigen, lot, method, temperature, pH, buffer, concentration and replicate. Prefixes <, <=, > and >= remain censored observations. KD, EC50, kon and koff are separate endpoints. Unknown conditions stay unknown; measurements are not averaged automatically.

## Save and recover

Save / Save as retains original inputs, engine results, structures, measurements, reference packs, camera, selections, pins and notes. Observation snapshots capture view state and input digests. A debounced recovery file in VS Code global storage restores unsaved work when the workspace reopens. This is one recovery slot, not multi-project version control. Explicitly save important projects.

PNG export also writes a JSON sidecar with rendering/view metadata. JSON report export preserves sequences, observations, sources and references; a full project is needed for embedded structural coordinates. FASTA export contains the current ordered sequence records. CSV exports cover sequence properties, measurements and local surface profiles, preserving units, censoring and missing values. Text beginning with spreadsheet formula characters is apostrophe-prefixed for safe opening in spreadsheet applications.

## Runtime troubleshooting

Install analysis runtime requires Python 3.12 (`py -3.12` on Windows) and package-download access. Installation and analysis display status and can be cancelled. The installation is recognized only after dependency imports succeed. Use an existing runtime selects a Python executable without running workspace scripts. Diagnostics show actual engine versions. On Windows the installer uses the tested locked dependency file. Other OS environments have not yet undergone the same end-to-end validation.

## Entities and selected-region search

Evidence contains an explicit entity registry for constructs, specimens, antigens and sources. Constructs list sequence IDs and distinct chain-copy IDs; specimens reference a construct and retain lot and conditions. Identical names or sequences never merge identities. Measurement specimen IDs link only to an exact registered entity ID; unresolved IDs remain visible. The registry does not yet implement the full binding-unit connectivity graph.

Select a sequence range and run region similarity search to compare it against the collection using local BLOSUM62 alignment. Results retain score, aligned-column identity, query coverage, target range and input digests. Exact duplicates remain separate hits. Local alignment similarity does not establish a gene assignment or common ancestry.

The local worker caches eligible calculations by input, parameters, implementation and reference fingerprints. Cached payloads are integrity-checked and bounded to 512 MiB; prediction and OASis reference evaluation are excluded from this cache. Cache and recovery files contain research data in local extension storage.
