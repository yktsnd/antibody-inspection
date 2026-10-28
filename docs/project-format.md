# Shipped project format

The runtime stores a UTF-8 JSON object with `format: "antibody-inspection"` and `version: 1`. This is the small R0 format. It is **not** the richer future project contract in the design specification.

| Field | Meaning |
| --- | --- |
| `source.type` | `fasta` |
| `source.raw` | Complete original input text |
| `records` | Ordered sequence records, corresponding one-for-one with reparsed original FASTA |
| `records[].id` | Unique immutable record ID; duplicate display names are allowed |
| `records[].name`, `sequence`, `length` | Header, normalized uppercase sequence and character count |
| `records[].annotations` | User-supplied ranges: `id`, `kind`, 1-based inclusive `start`/`end`, free-text `definition`, `evidence: "user"` |
| `records[].note` | Per-record plain-text observation, up to 20,000 characters |
| `view.selectedRecordId` | Selected record |
| `view.referenceId` | Optional alignment reference |
| `view.annotationId` | Optional selected annotation belonging to the selected record |

The view is optional so v0.1.0 projects still open. The current app writes it on new projects and supplies a default for older projects. References and range bounds are validated. Record content must match the normalized original FASTA; editing JSON to replace sequences while retaining analyses is rejected. Use a new import for changed sequence input.

A saved file contains sequence data and notes in plain text. There is no encryption, external asset store, schema migration engine, file locking, automatic backup or scientific analysis cache. Generic alignment is recalculated on request and is not stored. Do not edit the file concurrently from multiple applications.
