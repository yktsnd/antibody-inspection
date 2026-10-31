import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
from surface_profile import evaluate


def atom(rid,resn,x,chain='H'):
    return {'residueId':rid,'resn':resn,'x':x,'y':0.,'z':0.,'model':0,'chain':chain}

class SurfaceTests(unittest.TestCase):
    def test_patch_connectivity_area_denominators_and_chain_scope(self):
        atoms=[atom('a','ALA',0),atom('b','VAL',5),atom('c','LEU',10),atom('d','PHE',30),atom('e','LYS',1),atom('f','HIS',2),atom('excluded','TRP',3,'X')]
        def sasa(p):
            self.assertEqual(len(p['atoms']),6)
            return {'total':60.,'residues':{a['residueId']:10. for a in p['atoms']},'method':'fixture'}
        result=evaluate({'atoms':atoms,'chains':['H']},sasa)
        h=result['groups']['hydrophobic']
        self.assertEqual(h['exposedArea'],40)
        self.assertEqual(h['largestPatchArea'],30)
        self.assertEqual(h['patches'][0]['residueIds'],['a','b','c'])
        self.assertAlmostEqual(h['surfaceFraction'],2/3)
        self.assertEqual(result['groups']['positive']['exposedArea'],10)
        self.assertEqual(result['groups']['negative']['largestPatchArea'],0)
        self.assertEqual(len(result['inputDigest']),64)
    def test_small_exposure_counts_in_area_but_not_patch(self):
        result=evaluate({'atoms':[atom('a','ALA',0)],'chains':['H']},lambda p:{'total':4.,'residues':{'a':4.}})
        self.assertEqual(result['groups']['hydrophobic']['exposedArea'],4)
        self.assertEqual(result['groups']['hydrophobic']['patches'],[])
    def test_missing_chains_and_nonfinite_rejected(self):
        for params in [{'atoms':[],'chains':['H']},{'atoms':[atom('a','ALA',float('nan'))],'chains':['H']},{'atoms':[],'chains':[]}]:
            with self.assertRaises(ValueError):evaluate(params,lambda p:None)

if __name__=='__main__':unittest.main()
