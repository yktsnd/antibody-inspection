"""ImmuneBuilder neural models with explicit ANARCII-prepared domain coordinates.

Inference/ensemble operations follow ImmuneBuilder 1.2 (BSD-3-Clause,
Copyright 2022 Brennan Abanades Kenyon). This adapter replaces ANARCI/HMMER
input preparation, not the trained neural models. No downloads occur here.
"""
import gc
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import tempfile
from models import CHECKSUMS, checksums


def predict(params):
    import torch
    from ImmuneBuilder.models import StructureModule
    from ImmuneBuilder.util import get_encoding
    from ImmuneBuilder.ABodyBuilder2 import Antibody
    from ImmuneBuilder.NanoBodyBuilder2 import Nanobody
    from ImmuneBuilder.refine import refine
    import gemmi
    kind = params.get('kind')
    if kind not in ['antibody', 'nanobody']:
        raise ValueError('Choose Fv or VHH explicitly.')
    inputs = params['chains']
    expected_chains = ['H', 'L'] if kind == 'antibody' else ['H']
    if sorted(inputs) != sorted(expected_chains):
        raise ValueError('Fv requires one H and one L domain; VHH requires one H domain.')
    numbered, sequences, sources = {}, {}, {}
    for chain in expected_chains:
        item = inputs[chain]
        seq, domain = item['sequence'], item['domain']
        residues = domain['residues']
        if domain['chainType'] not in (['H'] if chain == 'H' else ['K', 'L']):
            raise ValueError('Domain type does not match the requested prediction chain.')
        if not residues or min(r['position'] for r in residues) >= 8 or max(r['position'] for r in residues) <= 120:
            raise ValueError('Prediction requires a complete variable domain (IMGT termini near 1 and 128).')
        if any(r['aa'] not in 'ACDEFGHIKLMNPQRSTVWY' or seq[r['index0']] != r['aa'] for r in residues):
            raise ValueError('Prediction requires standard residues and valid original-input mapping.')
        numbered[chain] = [((r['position'], r['insertion'] or ' '), r['aa']) for r in residues]
        sequences[chain] = ''.join(r['aa'] for r in residues)
        if not 70 < len(sequences[chain]) <= 180:
            raise ValueError('Prediction is limited to complete variable domains of 71–180 residues.')
        sources[chain] = {'recordId': item['recordId'], 'inputDigest': hashlib.sha256(seq.encode()).hexdigest(), 'start0': domain['start0'], 'end0': domain['end0'], 'indices': [r['index0'] for r in residues]}
    directory = Path(os.environ.get('ANTIBODY_MODEL_DIR', Path(__file__).resolve().parent.parent/'work/models'))
    weights = []
    for i in range(1, 5):
        name = f'{kind}_model_{i}'
        file = directory/name
        if not file.exists():
            raise ValueError('Prediction models are missing. Use Prepare prediction models before offline prediction.')
        md5, sha = checksums(file)
        if md5 != CHECKSUMS[name]:
            raise ValueError(f'{name} failed its published checksum; prepare the models again.')
        weights.append({'name': name, 'sha256': sha, 'release': '10.5281/zenodo.7258553'})
    torch.set_num_threads(2)
    # Process ensemble members sequentially to keep peak memory suitable for a laptop.
    sequences.setdefault('L', '')
    numbered.setdefault('L', [])
    full_sequence = sequences['H'] + sequences['L']
    outputs = []
    with torch.inference_mode():
        encoding = torch.tensor(get_encoding(sequences, 'HL' if kind == 'antibody' else 'H'), dtype=torch.float32, device='cpu')
        for i, weight in enumerate(weights, 1):
            print(f'Predicting ensemble member {i}/4', flush=True)
            model = StructureModule(rel_pos_dim=64, embed_dim=128 if i == 1 else 256).to('cpu')
            model.load_state_dict(torch.load(directory/weight['name'], map_location='cpu', weights_only=True))
            model.eval()
            outputs.append(model(encoding, full_sequence))
            del model
            gc.collect()
        result = (Antibody if kind == 'antibody' else Nanobody)(numbered, outputs)
    error = result.error_estimates.mean(0).sqrt().cpu().tolist()
    with tempfile.TemporaryDirectory(prefix='antibody-model-') as temporary:
        raw_file, refined_file = str(Path(temporary)/'raw.pdb'), str(Path(temporary)/'refined.pdb')
        result.save_single_unrefined(raw_file, index=result.ranking[0])
        print('Refining ranked model with OpenMM on CPU', flush=True)
        success = refine(raw_file, refined_file, check_for_strained_bonds=True, n_threads=2)
        st = gemmi.read_structure(refined_file if success else raw_file)
        residues = [r for c in st[0] for r in c if gemmi.find_tabulated_residue(r.name).is_amino_acid()]
        restored = ''.join(gemmi.find_tabulated_residue(r.name).one_letter_code.upper() for r in residues)
        if restored != full_sequence:
            raise ValueError('Predicted coordinate sequence differs from the modeled variable domains.')
        for r, value in zip(residues, error):
            for atom in r:
                atom.b_iso = value
        text = 'REMARK  PREDICTED VARIABLE DOMAIN ONLY; ANARCII INPUT PREPARATION\n' + st.make_pdb_string()
    return {'text': text, 'format': 'pdb', 'sourceResidues': sources,
            'provenance': {'method': 'ABodyBuilder2' if kind == 'antibody' else 'NanoBodyBuilder2', 'version': importlib.metadata.version('ImmuneBuilder'), 'inputPreparation': 'ANARCII 2.0.8 IMGT; existing numbered variable domains', 'scope': 'Fv only' if kind == 'antibody' else 'VHH only', 'device': 'CPU', 'threads': 2, 'modelWeights': weights, 'ensembleSize': 4, 'rankedModel': result.ranking[0]+1, 'refinement': 'OpenMM amber14/protein.ff14SB', 'refinementStatus': 'succeeded' if success else 'failed; unrefined coordinates retained', 'openmmVersion': importlib.metadata.version('OpenMM'), 'qualityField': 'ensemble RMS coordinate dispersion (Å), not pLDDT or crystallographic B-factor', 'residueError': error, 'evidenceKind': 'predicted'}}
