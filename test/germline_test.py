import json
import sys
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'worker'))
from germline import compare

class GermlineTests(unittest.TestCase):
    def test_exact_reference_and_denominators(self):
        pack=json.loads((ROOT/'references/germline-aa.json').read_text())
        entry=next(e for e in pack['entries'] if e['species']=='human' and e['segment']=='V' and e['chainType']=='H')
        residues=[]
        for pos,aa in enumerate(entry['imgtAligned'],1):
            if aa!='-':residues.append({'position':pos,'insertion':'','aa':aa,'index0':len(residues)})
        sequence=''.join(r['aa'] for r in residues)
        domain={'chainType':'H','residues':residues,'start0':0,'end0':len(sequence)}
        result=compare({'sequence':sequence,'domains':[domain]})
        group=result['domains'][0]['segments']['V'];best=group['candidates'][0]
        self.assertEqual(best['identity'],1)
        self.assertEqual(best['referenceCoverage'],1)
        self.assertEqual(best['compared'],len(sequence))
        self.assertGreaterEqual(group['topTieCount'],1)
        self.assertEqual(result['domains'][0]['segments']['J']['status'],'not_evaluable')
        mutated=('A' if sequence[0]!='A' else 'C')+sequence[1:]
        with self.assertRaisesRegex(ValueError,'does not match'):
            compare({'sequence':mutated,'domains':[domain]})
    def test_unknown_species_and_empty_domain(self):
        with self.assertRaises(ValueError):compare({'sequence':'A','domains':[],'species':'fictional'})
        result=compare({'sequence':'X','domains':[{'chainType':'H','residues':[{'position':1,'insertion':'','aa':'X','index0':0}],'start0':0,'end0':1}]})
        for segment in result['domains'][0]['segments'].values():
            self.assertEqual(segment['status'],'not_evaluable')
            self.assertEqual(segment['candidates'],[])

if __name__=='__main__':unittest.main()
