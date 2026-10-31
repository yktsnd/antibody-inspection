"""Transparent local surface descriptors; not TAP or a calibrated risk model."""
import hashlib
import json
import math
from collections import defaultdict

PROTOCOL='antibody-inspection.surface-profile/1'
GROUPS={'hydrophobic':{'ALA','VAL','ILE','LEU','MET','PHE','TRP','TYR'},'positive':{'LYS','ARG'},'negative':{'ASP','GLU'}}

def evaluate(params,calculate_sasa):
    chains=sorted(set(params.get('chains',[])))
    if not chains or any(not isinstance(c,str) for c in chains):
        raise ValueError('Choose one or two explicit protein chains.')
    if len(chains)>2:raise ValueError('Choose at most two chains per surface profile.')
    atoms=[a for a in params['atoms'] if a['model']==0 and a['chain'] in chains]
    if set(chains)!={a['chain'] for a in atoms}:raise ValueError('A selected chain has no model-0 coordinates.')
    if any(not math.isfinite(a[k]) for a in atoms for k in ('x','y','z')):raise ValueError('Coordinates must be finite.')
    surface=calculate_sasa({'atoms':atoms,'modelId':0,'probeRadius':1.4,'points':300})
    areas=surface['residues'];resnames={a['residueId']:a['resn'] for a in atoms}
    groups={}
    for name,names in GROUPS.items():
        exposed={r for r,area in areas.items() if area>=5.0 and resnames[r] in names}
        edges={r:set() for r in exposed};grid=defaultdict(list)
        for atom in atoms:
            rid=atom['residueId']
            if rid not in exposed:continue
            cell=tuple(math.floor(atom[k]/6.0) for k in ('x','y','z'))
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    for dz in (-1,0,1):
                        for other in grid[(cell[0]+dx,cell[1]+dy,cell[2]+dz)]:
                            oid=other['residueId']
                            if oid!=rid and sum((atom[k]-other[k])**2 for k in ('x','y','z'))<=36:
                                edges[rid].add(oid);edges[oid].add(rid)
            grid[cell].append(atom)
        remaining=set(exposed);patches=[]
        while remaining:
            stack=[min(remaining)];component=set()
            while stack:
                rid=stack.pop()
                if rid in component:continue
                component.add(rid);remaining.discard(rid);stack.extend(edges[rid]-component)
            patches.append({'residueIds':sorted(component),'area':sum(areas[r] for r in component)})
        patches.sort(key=lambda p:(-p['area'],p['residueIds']))
        total=sum(area for rid,area in areas.items() if resnames[rid] in names)
        groups[name]={'residueNames':sorted(names),'exposedArea':total,'surfaceFraction':total/surface['total'] if surface['total'] else None,'largestPatchArea':patches[0]['area'] if patches else 0,'patches':patches,'exposedResidueCount':len(exposed)}
    canonical=json.dumps(atoms,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)
    return {'protocol':PROTOCOL,'status':'succeeded','inputDigest':hashlib.sha256(canonical.encode()).hexdigest(),'chains':chains,'modelId':0,'totalArea':surface['total'],'groups':groups,'sasa':{k:v for k,v in surface.items() if k!='residues'},'parameters':{'probeRadius':1.4,'points':300,'exposedResidueMinimumArea':5.0,'patchDistance':6.0,'patchConnectivity':'connected components of exposed same-class residues; any protein heavy-atom pair within cutoff','chargeDefinition':'residue classes K/R positive, D/E negative; histidine and terminal groups excluded; no pH or electrostatic calculation','scope':'selected chains in isolation; other chains, waters, ligands and hydrogens excluded'},'unit':'Å²','evidenceKind':'computed','interpretation':'Descriptive surface geometry, not TAP, a validated developability score, or a pass/fail decision. Compare only equivalent constructs, coordinate preparation and this protocol.'}
