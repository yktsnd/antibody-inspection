import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
from cache import dispatch
class CacheTests(unittest.TestCase):
    def test_hit_input_invalidation_and_corruption(self):
        calls=[]
        def run(p):calls.append(p);return {'value':p['value']}
        with tempfile.TemporaryDirectory() as d:
            a=dispatch('analysis.sequence',{'value':1},run,{'version':'1'},d)
            b=dispatch('analysis.sequence',{'value':1},run,{'version':'1'},d)
            self.assertFalse(a['execution']['cacheHit']);self.assertTrue(b['execution']['cacheHit']);self.assertEqual(len(calls),1)
            dispatch('analysis.sequence',{'value':2},run,{'version':'1'},d)
            dispatch('analysis.sequence',{'value':1},run,{'version':'2'},d)
            self.assertEqual(len(calls),3)
            file=Path(d)/(a['execution']['cacheKey']+'.json');data=json.loads(file.read_text());data['result']['value']=99;file.write_text(json.dumps(data))
            c=dispatch('analysis.sequence',{'value':1},run,{'version':'1'},d)
            self.assertFalse(c['execution']['cacheHit']);self.assertEqual(c['value'],1)
    def test_failure_is_not_cached(self):
        with tempfile.TemporaryDirectory() as d:
            def fail(p):raise ValueError('failed')
            with self.assertRaises(ValueError):dispatch('analysis.sequence',{},fail,{},d)
            self.assertEqual(list(Path(d).iterdir()),[])
if __name__=='__main__':unittest.main()
