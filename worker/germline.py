"""Numbered amino-acid reference similarity, never V(D)J gene assignment."""
import hashlib
import json
from pathlib import Path


def compare(params):
    sequence=params['sequence']
    species=params.get('species','human')
    file=Path(__file__).resolve().parents[1]/'references/germline-aa.json'
    raw=file.read_bytes()
    pack=json.loads(raw)
    available=sorted({e['species'] for e in pack['entries']})
    if species not in available:
        raise ValueError('Select a reference species from '+', '.join(available))
    domains=[]
    for index,domain in enumerate(params['domains']):
        observed={r['position']:r for r in domain['residues'] if not r['insertion'] and r['aa'] in 'ACDEFGHIKLMNPQRSTVWY'}
        if any(sequence[r['index0']]!=r['aa'] for r in domain['residues']):
            raise ValueError('Numbered domain does not match its input sequence.')
        groups={}
        for segment in ['V','J']:
            candidates=[]
            for entry in pack['entries']:
                if entry['species']!=species or entry['segment']!=segment or entry['chainType']!=domain['chainType']:
                    continue
                reference={i+1:aa for i,aa in enumerate(entry['imgtAligned']) if aa!='-'}
                paired=[(pos,aa,observed[pos]) for pos,aa in reference.items() if pos in observed]
                if len(paired)<(50 if segment=='V' else 5):
                    continue
                matches=sum(aa==r['aa'] for _,aa,r in paired)
                candidates.append({'gene':entry['gene'],'species':species,'segment':segment,'identity':matches/len(paired),'matched':matches,'compared':len(paired),'referenceLength':len(reference),'referenceCoverage':len(paired)/len(reference),'differences':[{'position':pos,'index0':r['index0'],'reference':aa,'query':r['aa']} for pos,aa,r in paired if aa!=r['aa']]})
            candidates.sort(key=lambda c:(-c['identity'],-c['referenceCoverage'],c['gene']))
            selected=candidates[:5]
            groups[segment]={'status':'succeeded' if selected else 'not_evaluable','candidateCount':len(candidates),'topTieCount':sum(c['identity']==candidates[0]['identity'] and c['referenceCoverage']==candidates[0]['referenceCoverage'] for c in candidates) if candidates else 0,'candidates':selected}
        domains.append({'domainIndex':index,'chainType':domain['chainType'],'start0':domain['start0'],'end0':domain['end0'],'segments':groups,'ignoredInsertionCount':sum(bool(r['insertion']) for r in domain['residues'])})
    return {'inputDigest':hashlib.sha256(sequence.encode()).hexdigest(),'method':'IMGT-position amino-acid reference identity','version':'1','species':species,'availableSpecies':available,'interpretation':'Reference similarity candidates, not a V(D)J gene call or an inference of biological origin. Protein input cannot resolve synonymous alleles or rearrangement history. V and J are compared independently.','denominator':'Matched observed standard-AA / non-gap reference positions; insertion-coded residues excluded; reference coverage reported separately. Top five candidates shown; tied-best count retained.','reference':{k:v for k,v in pack.items() if k!='entries'}|{'digest':hashlib.sha256(raw).hexdigest()},'domains':domains,'evidenceKind':'computed'}
