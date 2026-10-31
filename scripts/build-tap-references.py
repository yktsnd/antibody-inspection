"""Extract published numeric populations, never reconstructed histogram counts.

Run with the bundled analysis Python and an unmodified Supplementary Data 1
workbook from doi:10.1038/s42003-023-05744-8. No network access or workbook edits.
"""
import hashlib
import json
from pathlib import Path
import sys
import openpyxl

source = Path(sys.argv[1])
target = Path(sys.argv[2])
workbook = openpyxl.load_workbook(source, read_only=True, data_only=True)
source_digest = hashlib.sha256(source.read_bytes()).hexdigest()
packs = []
for cohort, sheet, expected in [('CSTall', 'Fig1+Fig3+Fig4+Table1_CSTs_ABB2', 664), ('Natall', 'Fig1+Figs3-5_Nat_ABB2', 79759)]:
    rows = list(workbook[sheet].values)
    assert list(rows[0][1:]) == ['Total CDR Length', 'PSH', 'PPC', 'PNC', 'SFvCSP']
    data = rows[1:]
    assert len(data) == expected and len({r[0] for r in data}) == expected
    for column, metric in enumerate(rows[0][1:], 1):
        values = [r[column] for r in data]
        assert all(isinstance(v, (int, float)) for v in values)
        packs.append({
            'id': f'TAP2-2023-{cohort}-{metric.replace(" ", "-")}',
            'version': '2024-SupplementaryData1', 'metric': 'TAP.'+metric,
            'unit': 'residues' if column == 1 else 'TAP score',
            'protocol': 'Raybould2024/TAP2/ABodyBuilder2/published-SupplementaryData1',
            'source': 'https://doi.org/10.1038/s42003-023-05744-8',
            'license': 'CC-BY-4.0 (article supplementary data)',
            'evidenceKind': 'computed', 'cohort': cohort,
            'denominator': f'{expected} nonredundant paired Fvs; published sheet rows, not repeat-model runs',
            'exclusions': 'Source authors selection: '+('human-use therapeutics at least phase II, complete paired Fvs; excludes single domains' if cohort == 'CSTall' else 'natively paired human OAS sequences; source filtering retained'),
            'duplicateRule': 'Source authors: 100% paired-Fv sequence identity; no further deduplication',
            'sourceWorkbookDigest': source_digest, 'sourceSheet': sheet,
            'sourceColumn': column+1, 'sourceRows': [2, expected+1],
            'notes': 'Single published dataset. Not the three-run sensitivity sheet or confidence-filtered subset. Natural population denominator follows the numeric source sheet (79759); article prose also contains an inconsistent 88274.',
            'values': values,
        })
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(packs, separators=(',', ':')), encoding='utf-8')
print(json.dumps({'packs': len(packs), 'populations': [664, 79759], 'sha256': source_digest, 'bytes': target.stat().st_size}))
