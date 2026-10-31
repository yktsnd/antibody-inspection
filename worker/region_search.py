"""Local residue-region search with explicit alignment denominators."""
import hashlib

def search(params):
    from Bio.Align import PairwiseAligner, substitution_matrices
    query=params['query'];standard=set('ACDEFGHIKLMNPQRSTVWY')
    if not 4<=len(query)<=1000 or set(query)-standard:raise ValueError('Select 4–1,000 standard amino acids for region search.')
    records=params['records']
    if len(records)>1000:raise ValueError('Region search is limited to 1,000 records per collection.')
    aligner=PairwiseAligner(mode='local',substitution_matrix=substitution_matrices.load('BLOSUM62'),open_gap_score=-10,extend_gap_score=-0.5)
    hits=[];skipped=[]
    for record in records:
        sequence=record['sequence']
        if set(sequence)-standard or len(sequence)>10000:
            skipped.append({'id':record['id'],'reason':'Requires standard amino acids and at most 10,000 residues.'});continue
        alignments=aligner.align(query,sequence)
        if not len(alignments):continue
        a=alignments[0];qblocks,tblocks=a.aligned
        pairs=[(int(q)+i,int(t)+i) for (q,qe),(t,te) in zip(qblocks,tblocks) for i in range(int(qe-q))]
        matches=sum(query[q]==sequence[t] for q,t in pairs)
        hits.append({'id':record['id'],'name':record['name'],'start0':int(tblocks[0][0]),'end0':int(tblocks[-1][1]),'queryStart0':int(qblocks[0][0]),'queryEnd0':int(qblocks[-1][1]),'matches':matches,'alignedColumns':int(a.length),'pairedPositions':len(pairs),'identity':matches/a.length,'queryCoverage':len(pairs)/len(query),'score':float(a.score),'targetDigest':hashlib.sha256(sequence.encode()).hexdigest()})
    hits.sort(key=lambda h:(-h['score'],-h['queryCoverage'],-h['identity'],h['id']))
    return {'query':query,'inputDigest':hashlib.sha256(query.encode()).hexdigest(),'method':'Biopython local pairwise alignment','protocol':'BLOSUM62; gap open -10; extension -0.5; best alignment per input record','denominator':'identity = exact matches / aligned columns including internal gaps; query coverage = paired query positions / query length; unaligned query termini excluded from identity and included in coverage denominator','scope':'all supplied protein records; duplicates retained; no automatic homology or chain-pairing assertion','recordCount':len(records),'hits':hits,'skipped':skipped,'evidenceKind':'computed'}
