import json, pathlib, urllib.request, hashlib, concurrent.futures
ids=['P01857','P01859','P01860','P01861','P01871','P01876','P01877','P01880','P01854','P01834','P0DOY2']
out=pathlib.Path('work/uniprot');out.mkdir(parents=True,exist_ok=True)
def fetch(acc):
    data=urllib.request.urlopen('https://rest.uniprot.org/uniprotkb/'+acc+'.json',timeout=45).read()
    (out/(acc+'.json')).write_bytes(data)
    d=json.loads(data)
    if 'sequence' not in d:return None
    features=[]
    domains=[f for f in d.get('features',[]) if f['type']=='Domain' and 'Ig-like' in f.get('description','')]
    light='IGKC' in d['uniProtkbId'] or 'IGLC' in d['uniProtkbId']
    for i,f in enumerate(domains):
        features.append({'kind':'CL' if light else 'CH'+str(i+1),'start0':f['location']['start']['value']-1,'end0':f['location']['end']['value'],'description':f.get('description'),'evidence':f.get('evidences',[])})
    for f in d.get('features',[]):
        if f['type']=='Region' and 'hinge' in f.get('description','').lower():
            features.append({'kind':'hinge','start0':f['location']['start']['value']-1,'end0':f['location']['end']['value'],'description':f.get('description'),'evidence':f.get('evidences',[])})
    return {'accession':d['primaryAccession'],'name':d['uniProtkbId'],'title':d['proteinDescription']['recommendedName']['fullName']['value'],'sequence':d['sequence']['value'],'version':d['entryAudit'],'source':'https://www.uniprot.org/uniprotkb/'+d['primaryAccession'],'sourceDigest':hashlib.sha256(data).hexdigest(),'domains':features}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    values=list(pool.map(fetch,ids))
values=[v for v in values if v]
pathlib.Path('references').mkdir(exist_ok=True)
pathlib.Path('references/constant-domains.json').write_text(json.dumps({'id':'human-constant-uniprot-2026-10-29','license':'UniProt CC BY 4.0','source':'https://www.uniprot.org/help/license','scope':'Selected reviewed human constant-region reference sequences; not a complete species/allele catalogue','entries':values},indent=2))
print([(v['accession'],v['name'],[(x['kind'],x['start0'],x['end0']) for x in v['domains']]) for v in values])

