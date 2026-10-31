"""Build a versioned data-only amino-acid reference from installed ANARCI."""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import anarci.germlines

root=Path(__file__).resolve().parents[1]
source=Path(anarci.germlines.__file__)
entries=[]
for segment in ['V','J']:
    for chain in ['H','K','L']:
        for species, genes in anarci.germlines.all_germlines[segment][chain].items():
            for gene, aligned in genes.items():
                assert len(aligned)==128
                entries.append({'segment':segment,'chainType':chain,'species':species,'gene':gene,'imgtAligned':aligned})
pack={'id':'ANARCI-germline-AA','version':importlib.metadata.version('anarci'),'source':'https://github.com/oxpig/ANARCI/blob/master/lib/python/anarci/germlines.py','dataOrigin':'IMGT germline amino-acid alignments distributed with ANARCI; this is the packaged snapshot, not the current complete IMGT release','license':'ANARCI BSD-3-Clause; IMGT data CC-BY-4.0','licenseSource':'https://www.imgt.org/about/termsofuse.php','sourceDigest':hashlib.sha256(source.read_bytes()).hexdigest(),'entries':entries}
(root/'references/germline-aa.json').write_text(json.dumps(pack,separators=(',',':')),encoding='utf-8')
license_file=next(p for p in importlib.metadata.files('anarci') if str(p).endswith('/licenses/LICENCE'))
(root/'references/ANARCI-LICENSE.txt').write_text(license_file.locate().read_text(),encoding='utf-8')
print(len(entries),'amino-acid reference entries')
