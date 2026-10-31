# Local surface profile

The local surface profile is an independent, open implementation of descriptive protein-surface measurements. It is available without a SAbBox environment or license. Its protocol identifier is `antibody-inspection.surface-profile/1`.

It is not TAP, does not reproduce TAP thresholds and must not be overlaid on published TAP distributions. It reports no overall score or biological pass/fail result.

## Calculation

Select Chain A and Chain B in the Structure view. Select the same chain twice for a single-chain profile. The calculation uses model 0 and those chains in isolation. For an Fv comparison, use consistently prepared Fv coordinates; a Fab or antigen-bound complex is a different scope.

Solvent-accessible surface area uses Biopython Shrake–Rupley, default atomic radii, a 1.4 Å probe and 300 points per atom. Only the parsed protein heavy atoms are included. Waters, ligands, hydrogens and unselected chains are excluded. Missing coordinates remain missing.

| Descriptor | Definition |
| --- | --- |
| Hydrophobic exposed area | Sum of residue SASA for A, V, I, L, M, F, W and Y |
| Positive-class exposed area | Sum of residue SASA for K and R |
| Negative-class exposed area | Sum of residue SASA for D and E |
| Surface fraction | The class exposed area divided by all selected-chain protein SASA |
| Largest patch area | Largest connected-component sum of residue SASA within a class |

Patch vertices are residues with SASA ≥5 Å². An edge connects two residues in the same class when any of their protein heavy atoms are within 6 Å. Components are transitive: two residues in one component need not be directly within 6 Å of each other. Exposed area includes class residues below the 5 Å² patch threshold. Singleton patches are retained.

The charge classes are residue labels, not a pH-dependent electrostatic calculation. Histidine and terminal charges are excluded. Hydrophobicity is a fixed categorical definition; the surface is not weighted by hydrophobicity scales. The method does not identify aggregation propensity, viscosity, expression yield or clinical risk.

## Comparison and reproducibility

Each result stores the exact coordinate-input digest, structure-source digest, selected chains, model, protocol, SASA engine version, parameters, residue lists and units. Surface profiles are retained in saved projects and JSON analysis reports. The UI lists same-protocol structures together but does not assert construct equivalence or assign rankings.

Compare equivalent molecular scopes, coordinate completeness and preparation. A model with missing residues or a different chain selection can have a smaller surface area for reasons unrelated to developability. No universal thresholds are supplied. Build and validate an assay-matched internal reference set before interpreting associations with experimental outcomes.

The bundled Herceptin Fv demo contains a real precomputed result. Unit tests check connected components, area denominators, isolated-chain scope, threshold behavior and invalid input handling. This verification establishes calculation behavior; it is not experimental validation of a developability predictor.
