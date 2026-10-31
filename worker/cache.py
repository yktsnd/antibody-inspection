"""Bounded, content-addressed local cache. Invalid entries are treated as misses."""
import hashlib
import json
import os
from pathlib import Path
import re
import time
import uuid

CACHEABLE={'analysis.sequence','analysis.germline','analysis.regionSearch','sequence.translate','structure.parse','structure.contacts','structure.sasa','structure.surfaceProfile','structure.superpose'}

def canonical(value):return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=True,allow_nan=False)

def dispatch(method,params,execute,fingerprint,directory=None):
    if not directory or method not in CACHEABLE:return execute(params)
    root=Path(directory);key=hashlib.sha256(canonical({'method':method,'params':params,'fingerprint':fingerprint}).encode()).hexdigest();file=root/(key+'.json')
    try:
        if file.stat().st_size<=64*1024*1024:
            entry=json.loads(file.read_text(encoding='utf-8'))
            if entry['key']==key and entry['digest']==hashlib.sha256(canonical(entry['result']).encode()).hexdigest():
                os.utime(file,None);return {**entry['result'],'execution':{'cacheHit':True,'cacheKey':key,'computedAt':entry['computedAt']}}
    except (OSError,ValueError,KeyError,TypeError):pass
    result=execute(params)
    created=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime());entry={'key':key,'computedAt':created,'digest':hashlib.sha256(canonical(result).encode()).hexdigest(),'result':result}
    encoded=canonical(entry).encode()
    if len(encoded)<=64*1024*1024:
        temporary=None
        try:
            root.mkdir(parents=True,exist_ok=True);temporary=root/(key+'.'+uuid.uuid4().hex+'.tmp');temporary.write_bytes(encoded);os.replace(temporary,file)
            entries=[p for p in root.glob('*.json') if re.fullmatch(r'[a-f0-9]{64}\.json',p.name) and p.is_file() and not p.is_symlink()]
            entries.sort(key=lambda p:p.stat().st_mtime,reverse=True);total=0
            for item in entries:
                total+=item.stat().st_size
                if total>512*1024*1024:item.unlink()
        except OSError:pass
        finally:
            if temporary and temporary.exists():
                try:temporary.unlink()
                except OSError:pass
    return {**result,'execution':{'cacheHit':False,'cacheKey':key,'computedAt':created}}
