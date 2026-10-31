"""Archive tracked and non-ignored source files, including local changes."""
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
destination = Path(sys.argv[1]).resolve()
names = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
    for name in sorted(set(names)):
        if not name:
            continue
        file = (root/name).resolve()
        if not file.is_relative_to(root):
            raise ValueError('Source path outside repository')
        if file.is_file():
            archive.write(file, 'antibody-inspection/'+name)
print(f'{destination}: {destination.stat().st_size} bytes')
