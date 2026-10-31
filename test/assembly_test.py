import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
import gemmi
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
from assembly import expand
import engine

class AssemblyTests(unittest.TestCase):
    def test_copy_operator_preserves_author_ids_and_transforms_coordinates(self):
        def op(name,shift):
            transform=gemmi.Transform();transform.vec.x=shift
            return SimpleNamespace(name=name,transform=transform)
        assembly=SimpleNamespace(name='dimer',generators=[SimpleNamespace(chains=['H'],subchains=[],operators=[op('identity',0),op('translate',20)])])
        base={'atoms':[{'x':1.,'y':2.,'z':3.,'chain':'H','residueId':'0:H:1:'}], 'residues':[{'id':'0:H:1:','modelId':0,'authAsymId':'H','labelAsymId':'A','authSeqId':1,'atomIndices':[0]}],'chains':[],'disulfides':[]}
        result=expand(base,assembly)
        self.assertEqual([a['x'] for a in result['atoms']],[1.,21.])
        self.assertEqual([r['authAsymId'] for r in result['residues']],['H','H'])
        self.assertEqual(len({r['id'] for r in result['residues']}),2)
        self.assertNotEqual(result['atoms'][0]['chain'],result['atoms'][1]['chain'])
        self.assertEqual(result['atoms'][1]['sourceCoordinates'],[1.,2.,3.])
        self.assertEqual(base['atoms'][0]['x'],1.)
    def test_real_1n8z_identity_assembly(self):
        text=(Path(__file__).resolve().parents[1]/'examples/1N8Z.cif').read_text()
        original=engine.structure({'text':text,'format':'cif'})
        result=engine.structure({'text':text,'format':'cif','assemblyId':'1'})
        self.assertEqual(len(original['atoms']),len(result['atoms']))
        for a,b in zip(original['atoms'],result['atoms']):
            self.assertEqual([a[k] for k in ('x','y','z')],[b[k] for k in ('x','y','z')])
        self.assertEqual(result['assemblyId'],'1')
        with self.assertRaises(ValueError):engine.structure({'text':text,'format':'cif','assemblyId':'missing'})

if __name__=='__main__':unittest.main()
