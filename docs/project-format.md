# Project format — 0.4.0

UTF-8 JSON with `format: "antibody-inspection"`, `version: 1`. Older sequence-only projects remain readable. Optional research fields extend the original schema; this is not yet the full typed evidence graph required by R1.

| Field | Contents |
| --- | --- |
| source | Canonical FASTA used to validate ordered records |
| sources | Original imported table/file, digest and provenance where available |
| records | Immutable ID, display name, sequence, length, note, manual annotations, explicit construct/role/alphabet |
| records[].analysis | Input SHA-256, engine versions, IMGT/Kabat domains/residue maps, independent CDR definitions, germline candidates, constant-reference matches, properties, motif hits, status |
| records[].translation | Parent sequence ID, explicit frame, standard-code identifier, codon coordinates |
| structures | Original PDB/mmCIF, SHA-256, normalized protein atoms, residue/chain identities, mappings, contact/SASA results, assembly operators and instance IDs, versioned surface profiles with coordinate digests |
| observations | Record and specimen IDs, endpoint, value, unit, censoring operator, conditions and source |
| entities | Typed construct chain copies, specimens, antigens and source records with explicit IDs and links |
| regionSearch | Selected query range, target ranges, alignment scores, coverage, protocol and input digests |
| demo | Bundled tour steps and recorded view state |
| references | Versioned reference-pack metadata, numeric/null values and digest |
| view | Selected record/tab/structure, input residue range, numbering/CDR selectors, demo step, cross-chain targets, pins, camera, superposition transform and fit/evaluation definitions |
| snapshots | Named view state, timestamp and sequence digests |

Scientific residue intervals use zero-based half-open coordinates. Original manual annotations retain their explicit one-based inclusive `start`/`end` fields for backwards compatibility. The viewer converts them; no silent coordinate relabeling occurs.

Validation checks original sequence agreement, unique record/annotation IDs, ranges, analysis input digests and numbered-residue round trips, original structure digests, finite coordinates, mapping bounds, selected IDs/ranges and finite measurements. Maximum complete serialized project size is 64 MiB. Some optional scientific result objects are not yet covered by a formal JSON Schema.

Projects contain original data in plain text. A single recovery copy is written atomically to extension global storage after edits, and on panel disposal. Explicit project saves are separate. No database, multi-writer locking or general revision/migration service is implemented. Concurrent edits of the same saved file are unsupported.
