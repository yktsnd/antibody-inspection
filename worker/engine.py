"""Local JSON-lines worker. stdout is exclusively protocol data; no network calls."""
import contextlib
import hashlib
import importlib.metadata
import io
import json
import math
from pathlib import Path
import re
import sys
import time
from prediction import predict
from germline import compare as germline_similarity
from region_search import search as region_search

MODEL = None
HUMAN_DB = None
HUMAN_DB_DIGEST = None
AA = set('ACDEFGHIKLMNPQRSTVWY')
REGIONS = [('FR1', 1, 26), ('CDR1', 27, 38), ('FR2', 39, 55), ('CDR2', 56, 65), ('FR3', 66, 104), ('CDR3', 105, 117), ('FR4', 118, 128)]

def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()

def describe(_):
    versions = {}
    for name in ['anarcii', 'biopython', 'torch', 'numpy', 'gemmi', 'promb']:
        try:
            versions[name] = importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError:
            versions[name] = None
    return {'engine': 'antibody-inspection', 'version': '0.4.0', 'versions': versions, 'execution': 'local CPU', 'network': False}


def humanness(params):
    """Evaluate each numbered variable domain against the packaged OAS 9-mer set."""
    global HUMAN_DB, HUMAN_DB_DIGEST
    from promb import init_db
    from promb.db import HUMAN_OASIS_DB_PATH
    sequence = params['sequence']
    domains = params.get('domains', [])
    if not domains:
        raise ValueError('Number the antibody before evaluating variable-domain humanness.')
    if HUMAN_DB is None:
        HUMAN_DB = init_db('human-oas', verbose=False)
        HUMAN_DB_DIGEST = hashlib.sha256(Path(HUMAN_OASIS_DB_PATH).read_bytes()).hexdigest()
    results = []
    for i, domain in enumerate(domains):
        start, end = domain['start0'], domain['end0']
        if not isinstance(start, int) or not isinstance(end, int) or not 0 <= start < end <= len(sequence):
            raise ValueError('Invalid variable-domain interval.')
        seq = sequence[start:end]
        item = {'domainIndex': i, 'chainType': domain['chainType'], 'start0': start, 'end0': end}
        if len(seq) < 9 or set(seq) - AA:
            item.update(status='not_evaluable', reason='Requires at least 9 standard amino acids; ambiguous windows are not counted as nonhuman.')
        else:
            windows = [{'start0': start+j, 'end0': start+j+9, 'peptide': seq[j:j+9], 'found': HUMAN_DB.contains(seq[j:j+9])} for j in range(len(seq)-8)]
            item.update(status='succeeded', identity=HUMAN_DB.compute_peptide_content(seq), matched=sum(w['found'] for w in windows), total=len(windows), windows=windows)
        results.append(item)
    return {'inputDigest': digest(sequence), 'evidenceKind': 'computed', 'method': 'OASis 9-mer identity / promb', 'version': importlib.metadata.version('promb'),
            'reference': {'id': 'OASis_9mers_v1_10perc_subjects', 'digest': HUMAN_DB_DIGEST, 'source': 'https://github.com/MSDLLCpapers/promb', 'distributionLicense': 'MIT (promb distribution)', 'peptideCount': len(HUMAN_DB.peptides), 'threshold': 'human OAS peptides in >=10% of subjects (packaged reference)'},
            'denominator': 'all overlapping 9-mer windows per numbered variable domain; duplicate windows retained', 'scope': 'variable domains only; no cross-linker windows',
            'interpretation': 'Peptide-reference similarity; does not determine species of origin, immunogenicity or ADA probability.', 'domains': results}

def properties(sequence, ph=7.4):
    from Bio.SeqUtils.ProtParam import ProteinAnalysis
    if not sequence or set(sequence) - AA:
        return {'status': 'not_evaluable', 'reason': 'Properties require only the 20 standard amino acids.'}
    a = ProteinAnalysis(sequence)
    return {'status': 'succeeded', 'evidenceKind': 'computed', 'method': 'Biopython ProteinAnalysis',
            'version': importlib.metadata.version('biopython'), 'conditions': {'pH': ph, 'termini': 'free', 'modifications': 'none', 'mass': 'average', 'disulfides': 'reduced', 'scope': 'entire input chain'},
            'mw': a.molecular_weight(), 'pI': a.isoelectric_point(), 'charge': a.charge_at_pH(ph), 'gravy': a.gravy(), 'length': len(sequence)}

def liabilities(sequence):
    rules = [('N-glycosylation sequon', r'N[^P][ST]', 'Sequence motif only; glycosylation is not established.'),
             ('Deamidation motif', r'N[GS]', 'NG/NS motif; rate depends on conditions and structure.'),
             ('Asp isomerization motif', r'D[GS]', 'DG/DS motif; no reaction rate inferred.'),
             ('Oxidation-susceptible residue', r'[MW]', 'Methionine or tryptophan; exposure and conditions matter.')]
    hits = []
    for name, pattern, note in rules:
        for m in re.finditer('(?=(' + pattern + '))', sequence):
            hits.append({'kind': name, 'start0': m.start(), 'end0': m.start() + len(m[1]), 'sequence': m[1], 'evidenceKind': 'computed', 'method': pattern, 'note': note})
    return hits

def constant_domains(sequence, variable_domains):
    from Bio.Align import PairwiseAligner, substitution_matrices
    pack_path = Path(__file__).resolve().parent.parent / 'references' / 'constant-domains.json'
    if not pack_path.exists() or set(sequence) - AA:
        return []
    pack = json.loads(pack_path.read_text())
    aligner = PairwiseAligner(mode='local', substitution_matrix=substitution_matrices.load('BLOSUM62'), open_gap_score=-10, extend_gap_score=-0.5)
    hits = []
    for entry in pack['entries']:
        for domain in entry['domains']:
            if domain['kind'] == 'hinge':
                continue
            reference = entry['sequence'][domain['start0']:domain['end0']]
            alignments = aligner.align(sequence, reference)
            if not len(alignments):
                continue
            alignment = alignments[0]
            target_blocks, ref_blocks = alignment.aligned
            matched = sum(int(b-a) for a,b in ref_blocks)
            identity = sum(sequence[int(a)+i] == reference[int(c)+i] for (a,b),(c,d) in zip(target_blocks,ref_blocks) for i in range(int(b-a))) / max(1,matched)
            coverage = matched / len(reference)
            start0, end0 = int(target_blocks[0][0]), int(target_blocks[-1][1])
            if identity < .70 or coverage < .85 or any(max(start0,d['start0']) < min(end0,d['end0']) for d in variable_domains):
                continue
            mapping = [{'index0':int(a)+i,'referencePosition':domain['start0']+int(c)+i+1} for (a,b),(c,d) in zip(target_blocks,ref_blocks) for i in range(int(b-a))]
            hits.append({'kind':domain['kind'],'start0':start0,'end0':end0,'identity':identity,'coverage':coverage,'score':float(alignment.score),'reference':entry['accession'],'referenceName':entry['name'],'source':entry['source'],'referenceVersion':entry['version'],'mapping':mapping,'definition':domain['description'],'evidenceKind':'inferred','method':'local BLOSUM62; gap open -10, extend -0.5; identity >=0.70, reference coverage >=0.85','referencePack':pack['id']})
    groups = []
    for hit in sorted(hits,key=lambda x:x['score'],reverse=True):
        group = next((g for g in groups if max(g['start0'],hit['start0']) < min(g['end0'],hit['end0'])),None)
        if group:
            group['alternatives'].append({k:v for k,v in hit.items() if k not in ['mapping','alternatives']})
        else:
            groups.append({**hit,'alternatives':[]})
    return sorted(groups,key=lambda x:x['start0'])

def analyze(params):
    global MODEL
    from anarcii import Anarcii
    sequence = params['sequence'].upper()
    ph = float(params.get('pH', 7.4))
    if not 0 <= ph <= 14:
        raise ValueError('pH must be between 0 and 14.')
    result = {'inputDigest': digest(sequence), 'engine': describe({}), 'properties': properties(sequence, ph), 'liabilities': liabilities(sequence), 'domains': [], 'scheme': 'imgt', 'cdrDefinition': 'IMGT', 'evidenceKind': 'inferred'}
    if set(sequence) - (AA | {'X'}) or len(sequence) < 60:
        result.update(status='not_evaluable', reason='Numbering requires an ungapped protein sequence of at least 60 residues.')
        return result
    if len(sequence) > 3000:
        raise ValueError('Numbering is limited to 3,000 residues per chain.')
    if MODEL is None:
        MODEL = Anarcii(seq_type='antibody', mode='accuracy', cpu=True, ncpu=2, verbose=False)
    numbered = MODEL.number({'input': sequence}, scfv=len(sequence) > 200)
    # ANARCII creates multiple named entries for concatenated variable domains.
    for key, domain in numbered.items():
        if domain.get('error') or not domain.get('numbering'):
            continue
        start = domain['query_start']
        residues = []
        pos = start
        for (position, insertion), aa in domain['numbering']:
            if aa == '-':
                continue
            if pos >= len(sequence) or sequence[pos] != aa:
                raise ValueError('Numbering adapter failed the original-residue round-trip check.')
            region = next((name for name, lo, hi in REGIONS if lo <= position <= hi), 'unassigned')
            residues.append({'index0': pos, 'position': position, 'insertion': insertion.strip(), 'aa': aa, 'region': region})
            pos += 1
        regions = []
        for name, lo, hi in REGIONS:
            members = [r for r in residues if r['region'] == name]
            if members:
                regions.append({'kind': name, 'start0': members[0]['index0'], 'end0': members[-1]['index0'] + 1, 'sequence': ''.join(r['aa'] for r in members), 'definition': 'IMGT', 'evidenceKind': 'inferred'})
        result['domains'].append({'id': key, 'chainType': domain['chain_type'], 'start0': start, 'end0': pos, 'score': domain.get('score'), 'residues': residues, 'regions': regions})
    result['numberingVariants']={}
    if result['domains']:
        converted=MODEL.to_scheme('kabat')
        variants=[]
        for key,domain in converted.items():
            if domain.get('error') or not domain.get('numbering'):continue
            bounds=[(31,35),(50,65),(95,102)] if domain['chain_type']=='H' else [(24,34),(50,56),(89,97)]
            pos=domain['query_start'];residues=[]
            for (position,insertion),aa in domain['numbering']:
                if aa=='-':continue
                if pos>=len(sequence) or sequence[pos]!=aa:raise ValueError('Kabat mapping failed original-residue round trip.')
                region='FR4'
                for index,(lo,hi) in enumerate(bounds,1):
                    if position<lo:region='FR'+str(index);break
                    if position<=hi:region='CDR'+str(index);break
                residues.append({'index0':pos,'position':position,'insertion':insertion.strip(),'aa':aa,'region':region});pos+=1
            regions=[]
            for name in ['FR1','CDR1','FR2','CDR2','FR3','CDR3','FR4']:
                members=[r for r in residues if r['region']==name]
                if members:regions.append({'kind':name,'start0':members[0]['index0'],'end0':members[-1]['index0']+1,'sequence':''.join(r['aa'] for r in members),'definition':'Kabat','evidenceKind':'inferred'})
            variants.append({'id':key,'chainType':domain['chain_type'],'start0':domain['query_start'],'end0':pos,'residues':residues,'regions':regions})
        result['numberingVariants']['kabat']=variants
        result['cdrDefinitions']={'IMGT':{'scheme':'imgt','source':'IMGT unique numbering'},'Kabat':{'scheme':'kabat','source':'https://doi.org/10.1093/bib/bbae632','heavyBounds':[[31,35],[50,65],[95,102]],'lightBounds':[[24,34],[50,56],[89,97]],'insertionPolicy':'include insertion-coded residues at boundary positions'}}
    result['constantDomains'] = constant_domains(sequence,result['domains'])
    result['status'] = 'succeeded' if result['domains'] else 'not_evaluable'
    if not result['domains']:
        result['reason'] = '; '.join(str(d.get('error')) for d in numbered.values() if d.get('error')) or 'No variable domain was identified.'
    return result

def translate(params):
    from Bio.Seq import Seq
    raw = params['sequence'].upper().replace('U', 'T')
    frame = int(params.get('frame', 1))
    if frame not in [-3,-2,-1,1,2,3] or set(raw) - set('ACGTNRYKMSWBDHV'):
        raise ValueError('Select a valid reading frame and IUPAC nucleotide sequence.')
    seq = str(Seq(raw).reverse_complement()) if frame < 0 else raw
    offset = abs(frame) - 1
    end = offset + ((len(seq) - offset) // 3) * 3
    protein = str(Seq(seq[offset:end]).translate())
    codons = []
    for i, aa in enumerate(protein):
        start = offset + i * 3
        codons.append({'aaIndex0': i, 'start0': start if frame > 0 else len(raw) - start - 3, 'end0': start + 3 if frame > 0 else len(raw) - start, 'strand': 1 if frame > 0 else -1, 'codon': seq[start:start+3], 'aa': aa})
    return {'sequence': protein, 'frame': frame, 'codons': codons, 'trailingBases': len(seq) - end, 'table': 'NCBI standard genetic code (1)', 'inputDigest': digest(raw)}

def structure(params):
    import gemmi
    from Bio.PDB import NeighborSearch
    text, fmt = params['text'], params.get('format', 'pdb')
    st = gemmi.make_structure_from_block(gemmi.cif.read_string(text).sole_block()) if fmt == 'cif' else gemmi.read_pdb_string(text)
    if not len(st):
        raise ValueError('Structure has no coordinate models.')
    atoms, residues, chains = [], [], []
    for model_index, model in enumerate(st):
        for chain in model:
            chain_residues = []
            for res in chain:
                info = gemmi.find_tabulated_residue(res.name)
                if not info.is_amino_acid():
                    continue
                rid = f'{model_index}:{chain.name}:{res.seqid.num}:{res.seqid.icode.strip()}'
                item = {'id': rid, 'modelId': model_index, 'instanceId': 'asymmetric-unit', 'authAsymId': chain.name, 'labelAsymId': res.subchain or None, 'authSeqId': res.seqid.num, 'labelSeqId': res.label_seq, 'insertionCode': res.seqid.icode.strip(), 'name': res.name, 'aa': info.one_letter_code.upper(), 'atomIndices': []}
                for atom in res:
                    if atom.element.is_hydrogen or (atom.altloc not in ['\x00', ' ', 'A']):
                        continue
                    item['atomIndices'].append(len(atoms))
                    atoms.append({'x': atom.pos.x, 'y': atom.pos.y, 'z': atom.pos.z, 'elem': atom.element.name, 'atom': atom.name, 'resn': res.name, 'resi': res.seqid.num, 'icode': res.seqid.icode.strip(), 'chain': chain.name, 'model': model_index, 'b': atom.b_iso, 'occupancy': atom.occ, 'residueId': rid})
                if item['atomIndices']:
                    residues.append(item)
                    chain_residues.append(rid)
            if chain_residues:
                chains.append({'id': f'{model_index}:{chain.name}', 'modelId': model_index, 'authAsymId': chain.name, 'residueIds': chain_residues})
    if not atoms:
        raise ValueError('No protein heavy atoms were found.')
    if len(atoms) > 200000:
        raise ValueError('Structure exceeds the 200,000 heavy atom limit.')
    disulfides = []
    for connection in st.connections:
        if connection.type != gemmi.ConnectionType.Disulf:
            continue
        endpoints = []
        for partner in [connection.partner1, connection.partner2]:
            rid = f'0:{partner.chain_name}:{partner.res_id.seqid.num}:{partner.res_id.seqid.icode.strip()}'
            endpoints.append({'residueId': rid, 'atom': partner.atom_name, 'present': any(r['id'] == rid for r in residues)})
        disulfides.append({'name': connection.name, 'endpoints': endpoints, 'symmetry': str(connection.asu), 'reportedDistance': connection.reported_distance, 'unit': 'Å', 'evidenceKind': 'source annotation', 'source': 'PDB SSBOND / mmCIF struct_conn; not inferred from proximity'})
    result = {'digest': digest(text), 'atoms': atoms, 'residues': residues, 'chains': chains, 'disulfides': disulfides, 'modelCount': len(st), 'assemblyPolicy': 'asymmetric unit as supplied', 'availableAssemblies': [a.name for a in st.assemblies], 'origin': params.get('origin', 'unknown'), 'qualityField': params.get('qualityField', 'B-factor'), 'method': dict(st.info).get('_exptl.method', 'unknown')}

    if params.get('assemblyId'):
        assembly=next((a for a in st.assemblies if a.name==str(params['assemblyId'])),None)
        if assembly is None:raise ValueError('Assembly identifier is absent from the deposited source.')
        from assembly import expand
        return expand(result,assembly)
    return result


def geometry(params):
    import numpy as np
    atoms = params['atoms']
    group_a, group_b = params['chainA'], params['chainB']
    cutoff = float(params.get('cutoff', 4.5))
    model = int(params.get('modelId', 0))
    if group_a == group_b or not 0 < cutoff <= 20:
        raise ValueError('Choose two different chains and a cutoff between 0 and 20 Å.')
    a = [x for x in atoms if x['chain'] == group_a and x['model'] == model]
    b = [x for x in atoms if x['chain'] == group_b and x['model'] == model]
    if not a or not b:
        raise ValueError('Both chains must contain atoms in the selected model.')
    xyz_b = np.array([[x['x'],x['y'],x['z']] for x in b])
    pairs = {}
    for atom in a:
        dist = np.sqrt(np.sum((xyz_b - [atom['x'],atom['y'],atom['z']]) ** 2, axis=1))
        for index in np.flatnonzero(dist <= cutoff):
            other = b[int(index)]
            key = atom['residueId'] + '|' + other['residueId']
            if key not in pairs or dist[index] < pairs[key]['distance']:
                pairs[key] = {'a': atom['residueId'], 'b': other['residueId'], 'atomA': atom['atom'], 'atomB': other['atom'], 'distance': float(dist[index])}
    return {'contacts': sorted(pairs.values(), key=lambda x: x['distance']), 'cutoff': cutoff, 'unit': 'Å', 'method': 'minimum protein heavy-atom distance', 'modelId': model, 'chainA': group_a, 'chainB': group_b, 'evidenceKind': 'computed'}

def sasa(params):
    import numpy as np
    from Bio.PDB import Structure, Model, Chain, Residue, Atom
    from Bio.PDB.SASA import ShrakeRupley
    atoms = params['atoms']
    model_id = int(params.get('modelId', 0))
    probe = float(params.get('probeRadius', 1.4))
    points = int(params.get('points', 100))
    if not 0.5 <= probe <= 3 or points not in [100, 300, 960]:
        raise ValueError('Probe radius must be 0.5–3 Å; points must be 100, 300 or 960.')
    def compute(selected):
        st = Structure.Structure('selected')
        model = Model.Model(0)
        st.add(model)
        chains, residues = {}, {}
        for i, a in enumerate(selected):
            if a['chain'] not in chains:
                chains[a['chain']] = Chain.Chain(a['chain'])
                model.add(chains[a['chain']])
            if a['residueId'] not in residues:
                res = Residue.Residue((' ', a['resi'], a.get('icode') or ' '), a['resn'], '')
                residues[a['residueId']] = res
                chains[a['chain']].add(res)
            res = residues[a['residueId']]
            if a['atom'] not in res:
                res.add(Atom.Atom(a['atom'], np.array([a['x'],a['y'],a['z']]), a['b'], a['occupancy'], ' ', a['atom'], i, element=a['elem'].upper()))
        ShrakeRupley(probe_radius=probe, n_points=points).compute(st, level='R')
        values = {rid: float(r.sasa) for rid, r in residues.items()}
        return {'total': sum(values.values()), 'residues': values}
    selected = [a for a in atoms if a['model'] == model_id]
    if len(selected) > 50000:
        raise ValueError('SASA is limited to 50,000 atoms per calculation.')
    result = compute(selected)
    result.update(method='Shrake–Rupley / Biopython', version=importlib.metadata.version('biopython'), radii='Biopython default atomic radii', probeRadius=probe, points=points, unit='Å²', atomScope='protein heavy atoms; waters, ligands and hydrogens excluded', modelId=model_id, evidenceKind='computed')
    a, b = params.get('chainA'), params.get('chainB')
    if a and b and a != b:
        set_a = [x for x in selected if x['chain'] == a]
        set_b = [x for x in selected if x['chain'] == b]
        if not set_a or not set_b:
            raise ValueError('Both interface chains must contain atoms.')
        sa, sb, sab = compute(set_a)['total'], compute(set_b)['total'], compute(set_a+set_b)['total']
        result['interface'] = {'chainA': a, 'chainB': b, 'sasaA': sa, 'sasaB': sb, 'sasaAB': sab, 'deltaSASA': sa+sb-sab, 'halfDeltaSASA': (sa+sb-sab)/2}
    return result

def surface_profile(params):
    from surface_profile import evaluate
    return evaluate(params,sasa)


def superpose(params):
    import numpy as np
    fixed = np.array(params['fixed'], dtype=float)
    moving = np.array(params['moving'], dtype=float)
    if fixed.shape != moving.shape or len(fixed) < 3 or fixed.shape[1] != 3 or not np.isfinite(fixed).all() or not np.isfinite(moving).all():
        raise ValueError('At least three finite matched atom pairs are required.')
    fc, mc = fixed.mean(axis=0), moving.mean(axis=0)
    u, _, vt = np.linalg.svd((moving-mc).T @ (fixed-fc))
    rot = u @ vt
    if np.linalg.det(rot) < 0:
        u[:, -1] *= -1
        rot = u @ vt
    trans = fc - mc @ rot
    rmsd = float(np.sqrt(np.mean(np.sum((moving @ rot + trans-fixed)**2,axis=1))))
    result = {'rotation': rot.tolist(), 'translation': trans.tolist(), 'fitRmsd': rmsd, 'fitCount': len(fixed), 'method': 'Kabsch', 'unit': 'Å', 'convention': 'row vector x @ rotation + translation'}
    if params.get('evaluateFixed'):
        ef, em = np.array(params['evaluateFixed'], dtype=float), np.array(params['evaluateMoving'], dtype=float)
        if ef.shape != em.shape or ef.ndim != 2 or ef.shape[1] != 3 or not np.isfinite(ef).all() or not np.isfinite(em).all():
            raise ValueError('Evaluation atom sets must be matched.')
        result['evaluationRmsd'] = float(np.sqrt(np.mean(np.sum((em @ rot + trans-ef)**2,axis=1))))
        result['evaluationCount'] = len(ef)
    return result

METHODS = {'engine.describe': describe, 'analysis.sequence': analyze, 'analysis.germline': germline_similarity, 'analysis.regionSearch': region_search, 'analysis.humanness': humanness, 'structure.predict': predict, 'sequence.translate': translate, 'structure.parse': structure, 'structure.contacts': geometry, 'structure.sasa': sasa, 'structure.surfaceProfile': surface_profile, 'structure.superpose': superpose}
def dispatch(method,params):
    import os
    from cache import dispatch as cached_dispatch
    root=Path(__file__).resolve().parents[1]
    files=sorted(list((root/'worker').glob('*.py'))+list((root/'references').glob('*.json')))
    fingerprint={'versions':describe({})['versions'],'files':{str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}}
    return cached_dispatch(method,params,METHODS[method],fingerprint,os.environ.get('ANTIBODY_CACHE_DIR'))


def main():
    for line in sys.stdin:
        request = {}
        try:
            if len(line) > 32 * 1024 * 1024:
                raise ValueError('Message exceeds 32 MiB.')
            request = json.loads(line)
            with contextlib.redirect_stdout(sys.stderr):
                result = dispatch(request['method'],request.get('params', {}))
            response = {'jsonrpc': '2.0', 'id': request['id'], 'result': result}
            serialized = json.dumps(response, allow_nan=False)
        except Exception as error:
            response = {'jsonrpc': '2.0', 'id': request.get('id'), 'error': {'code': -32000, 'message': str(error), 'type': type(error).__name__}}
            serialized = json.dumps(response, allow_nan=False)
        print(serialized, flush=True)

if __name__ == '__main__':
    main()
