"""Explicit model preparation only. Prediction never invokes this downloader."""
import hashlib
import json
from pathlib import Path
import sys
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor, as_completed

CHECKSUMS = {
    'antibody_model_1': 'b63013452ad420b9bb3eeb6968216a6e',
    'antibody_model_2': 'e640916c5f1f8d5d8b2090688b6da64a',
    'antibody_model_3': '4b87b871b195ad4c53d9ee557bd2a47d',
    'antibody_model_4': 'f731fe2474f0d4533a27aa9412844d47',
    'nanobody_model_1': '4591075f467ca9f76a37a5d1d3cfe591',
    'nanobody_model_2': '620fc916720bc7068cd18c7afa1aea8d',
    'nanobody_model_3': 'f1ef0a66a54efb9d14ddbb97fdc30785',
    'nanobody_model_4': 'a7e14a33f4c00e96df896120e9cf8522',
}


def checksums(file):
    md5, sha = hashlib.md5(), hashlib.sha256()
    with open(file, 'rb') as handle:
        for block in iter(lambda: handle.read(1024*1024), b''):
            md5.update(block)
            sha.update(block)
    return md5.hexdigest(), sha.hexdigest()


def download(url, temporary, expected_md5, attempts=5):
    """Resume interrupted transfers, but only activate checksum-verified bytes."""
    for attempt in range(attempts):
        offset = temporary.stat().st_size if temporary.exists() else 0
        if offset and checksums(temporary)[0] == expected_md5:
            return
        headers = {'User-Agent': 'AntibodyInspection/0.3.0 model preparation'}
        if offset:
            headers['Range'] = f'bytes={offset}-'
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=120) as response:
                resume = response.status == 206
                if resume and not response.headers.get('Content-Range', '').startswith(f'bytes {offset}-'):
                    raise ValueError('Server returned an unexpected download range.')
                total = offset if resume else 0
                with temporary.open('ab' if resume else 'wb') as handle:
                    while block := response.read(1024*1024):
                        handle.write(block)
                        total += len(block)
                        if total % (32*1024*1024) < len(block):
                            print(f'{temporary.stem}: {total//(1024*1024)} MiB', flush=True)
            if checksums(temporary)[0] == expected_md5:
                return
            temporary.unlink()
            raise ValueError('Downloaded model checksum does not match the published release.')
        except urllib.error.HTTPError as error:
            if error.code == 416 and temporary.exists():
                temporary.unlink()
            elif error.code not in (408, 429, 500, 502, 503, 504):
                raise
            if attempt == attempts - 1:
                raise
        except (OSError, ValueError):
            if attempt == attempts - 1:
                raise
        print(f'Transfer interrupted; retrying ({attempt+2}/{attempts})', flush=True)
        time.sleep(min(2 ** attempt, 8))


def prepare(directory, kind):
    if kind not in ['antibody', 'nanobody']:
        raise ValueError('Choose antibody or nanobody models.')
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    manifest_path = directory/'model-manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    def fetch(i):
        name = f'{kind}_model_{i}'
        target = directory/name
        url = f'https://zenodo.org/records/7258553/files/{name}?download=1'
        if not target.exists() or checksums(target)[0] != CHECKSUMS[name]:
            print(f'Downloading {name} from Zenodo 7258553', flush=True)
            temporary = target.with_suffix('.part')
            download(url, temporary, CHECKSUMS[name])
            if checksums(temporary)[0] != CHECKSUMS[name]:
                raise ValueError(f'Checksum mismatch for {name}; file not activated.')
            temporary.replace(target)
        md5, sha = checksums(target)
        print(f'{name}: verified', flush=True)
        return name, {'source': url, 'release': '10.5281/zenodo.7258553', 'md5': md5, 'sha256': sha, 'bytes': target.stat().st_size}

    # Bound simultaneous transfers; manifest writes remain serialized.
    with ThreadPoolExecutor(max_workers=2) as pool:
        for future in as_completed([pool.submit(fetch, i) for i in range(1, 5)]):
            name, metadata = future.result()
            manifest[name] = metadata
            temporary_manifest = manifest_path.with_suffix('.tmp')
            temporary_manifest.write_text(json.dumps(manifest, indent=2), encoding='utf-8')
            temporary_manifest.replace(manifest_path)


if __name__ == '__main__':
    prepare(sys.argv[1], sys.argv[2])
