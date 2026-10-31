import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
from region_search import search
class RegionSearchTests(unittest.TestCase):
    def test_flanks_duplicates_and_denominators(self):
        query='WGGDGFYAMDY'
        r=search({'query':query,'records':[{'id':'a','name':'a','sequence':'AAAA'+query+'SSSS'},{'id':'b','name':'a','sequence':'AAAA'+query+'SSSS'},{'id':'c','name':'unknown','sequence':'XXXXXX'}]})
        self.assertEqual(len(r['hits']),2);self.assertEqual(len(r['skipped']),1)
        for h in r['hits']:
            self.assertEqual(h['start0'],4);self.assertEqual(h['end0'],15);self.assertEqual(h['identity'],1);self.assertEqual(h['queryCoverage'],1);self.assertEqual(h['alignedColumns'],len(query))
    def test_partial_query_has_explicit_low_coverage(self):
        r=search({'query':'WGGDGFYAMDY','records':[{'id':'a','name':'short','sequence':'DGFYAM'}]})
        self.assertEqual(r['hits'][0]['identity'],1);self.assertLess(r['hits'][0]['queryCoverage'],1)
if __name__=='__main__':unittest.main()
