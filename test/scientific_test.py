import contextlib
import io
import json
import math
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
import engine

ROOT=Path(__file__).resolve().parents[1]
class ScientificTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from Bio import SeqIO
        with (ROOT/'examples/antibodies.fasta').open() as handle:
            cls.seqs=list(SeqIO.parse(handle,'fasta'))
    def test_humanness_matches_reference_library_and_preserves_offsets(self):
        from promb import init_db
        seq=str(self.seqs[1].seq)
        numbered=engine.analyze({'sequence':seq})
        result=engine.humanness({'sequence':seq,'domains':numbered['domains']})
        domain=result['domains'][0]
        db=init_db('human-oas',verbose=False)
        fragment=seq[domain['start0']:domain['end0']]
        self.assertEqual(domain['identity'],db.compute_peptide_content(fragment))
        self.assertEqual(domain['total'],len(fragment)-8)
        self.assertEqual(domain['matched'],sum(w['found'] for w in domain['windows']))
        self.assertEqual(len(result['reference']['digest']),64)
        for w in domain['windows']:
            self.assertEqual(w['peptide'],seq[w['start0']:w['end0']])
        unknown=engine.humanness({'sequence':'XXXXXXXXXX','domains':[{'start0':0,'end0':10,'chainType':'H'}]})
        self.assertEqual(unknown['domains'][0]['status'],'not_evaluable')
        self.assertNotIn('identity',unknown['domains'][0])
    def test_kabat_roundtrip_and_definition_change(self):
        sequence=str(self.seqs[1].seq)
        result=engine.analyze({'sequence':sequence})
        kabat=result['numberingVariants']['kabat'][0]
        for r in kabat['residues']:
            self.assertEqual(sequence[r['index0']],r['aa'])
        cdr3=next(r for r in kabat['regions'] if r['kind']=='CDR3')
        self.assertEqual(cdr3['sequence'],'WGGDGFYAMDY')
        imgt=next(r for r in result['domains'][0]['regions'] if r['kind']=='CDR3')
        self.assertNotEqual(cdr3['start0'],imgt['start0'])
        self.assertEqual(sequence[cdr3['start0']:cdr3['end0']],cdr3['sequence'])
    def test_numbering_real_light_and_heavy(self):
        for index,kind,expected in [(0,'K',['QDVNTA','SAS','QQHYTTPPT']),(1,'H',['GFNIKDTY','IYPTNGYT','SRWGGDGFYAMDY'])]:
            seq=str(self.seqs[index].seq)
            with contextlib.redirect_stdout(sys.stderr):
                result=engine.analyze({'sequence':seq})
            self.assertEqual(result['status'],'succeeded')
            domain=result['domains'][0]
            self.assertEqual(domain['chainType'],kind)
            self.assertEqual([r['sequence'] for r in domain['regions'] if r['kind'].startswith('CDR')],expected)
            self.assertEqual(''.join(r['aa'] for r in domain['residues']),seq[domain['start0']:domain['end0']])
            self.assertEqual(result['constantDomains'][0]['kind'],'CL' if kind=='K' else 'CH1')
            # Adapter output must exactly match the selected standalone model mode.
            with contextlib.redirect_stdout(sys.stderr):
                raw=engine.MODEL.number({'input':seq},scfv=True)
            direct=next(d for d in raw.values() if d.get('numbering'))
            self.assertEqual([(r['position'],r['insertion'],r['aa']) for r in domain['residues']],[(p,ins.strip(),aa) for (p,ins),aa in direct['numbering'] if aa!='-'])
    def test_scfv_preserves_second_domain_offset(self):
        h=str(self.seqs[1].seq)[:120]
        l=str(self.seqs[0].seq)[:107]
        seq=h+'GGGGSGGGGSGGGGS'+l
        with contextlib.redirect_stdout(sys.stderr):
            result=engine.analyze({'sequence':seq})
        self.assertEqual(len(result['domains']),2)
        self.assertGreaterEqual(result['domains'][1]['start0'],len(h))
        for d in result['domains']:
            self.assertEqual(''.join(r['aa'] for r in d['residues']),seq[d['start0']:d['end0']])
    def test_unsupported_input_is_not_a_zero_result(self):
        r=engine.analyze({'sequence':'ACDX*'})
        self.assertEqual(r['status'],'not_evaluable')
        self.assertEqual(r['properties']['status'],'not_evaluable')
        self.assertNotIn('mw',r['properties'])
    def test_translation_and_reverse_strand_coordinates(self):
        x=engine.translate({'sequence':'ATGGCTTAA','frame':1})
        self.assertEqual(x['sequence'],'MA*')
        self.assertEqual(x['codons'][1]['start0'],3)
        y=engine.translate({'sequence':'TTAAGCCAT','frame':-1})
        self.assertEqual(y['sequence'],'MA*')
        self.assertEqual(y['codons'][0]['start0'],6)
        self.assertEqual(y['codons'][0]['end0'],9)
    def test_structure_ids_and_missing_residues(self):
        s=engine.structure({'text':(ROOT/'examples/1N8Z.cif').read_text(),'format':'cif','origin':'experimental'})
        self.assertEqual(len(s['chains']),3)
        self.assertEqual(s['origin'],'experimental')
        self.assertEqual(s['qualityField'],'B-factor')
        self.assertEqual(s['residues'][0]['authAsymId'],'A')
        self.assertIsNotNone(s['residues'][0]['labelSeqId'])
        self.assertLess(len(s['chains'][2]['residueIds']),607)
        self.assertEqual(len(s['disulfides']),27)
        bond=s['disulfides'][0]
        self.assertEqual([e['residueId'] for e in bond['endpoints']],['0:A:23:','0:A:88:'])
        self.assertEqual(bond['evidenceKind'],'source annotation')
        self.assertEqual(bond['reportedDistance'],2.09)
    def atom(self,x,chain,residue):
        return {'x':x,'y':0.,'z':0.,'elem':'C','atom':'CA','resn':'ALA','resi':residue,'icode':'','chain':chain,'model':0,'b':10.,'occupancy':1.,'residueId':chain+str(residue)}
    def test_contact_cutoff_uses_exact_distance(self):
        a=[self.atom(0,'A',1),self.atom(4.5,'B',1),self.atom(4.501,'B',2)]
        r=engine.geometry({'atoms':a,'chainA':'A','chainB':'B','cutoff':4.5})
        self.assertEqual(len(r['contacts']),1)
        self.assertEqual(r['contacts'][0]['distance'],4.5)
    def test_sasa_isolated_sphere_and_interface_convention(self):
        r=engine.sasa({'atoms':[self.atom(0,'A',1)],'points':300})
        self.assertAlmostEqual(r['total'],4*math.pi*(1.7+1.4)**2,places=6)
        r=engine.sasa({'atoms':[self.atom(0,'A',1),self.atom(3,'B',1)],'chainA':'A','chainB':'B','points':300})
        self.assertGreater(r['interface']['deltaSASA'],0)
        self.assertAlmostEqual(r['interface']['halfDeltaSASA']*2,r['interface']['deltaSASA'])
    def test_kabsch_recovers_rigid_transform(self):
        fixed=[[0,0,0],[1,0,0],[0,1,0],[0,0,1]]
        moving=[[5-y,2+x,4+z] for x,y,z in fixed]
        r=engine.superpose({'fixed':fixed,'moving':moving,'evaluateFixed':fixed,'evaluateMoving':moving})
        self.assertLess(r['fitRmsd'],1e-12)
        self.assertLess(r['evaluationRmsd'],1e-12)

if __name__=='__main__':
    unittest.main(verbosity=2)

