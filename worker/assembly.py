"""Expand deposited assembly operators while retaining source residue identity."""
import copy

def expand(base,assembly):
    result={k:copy.deepcopy(v) for k,v in base.items() if k not in ('atoms','residues','chains','disulfides')}
    result.update(atoms=[],residues=[],chains=[],disulfides=[],assemblyId=assembly.name,assemblyPolicy='deposited biological assembly '+assembly.name,assemblyOperators=[])
    for gi,generator in enumerate(assembly.generators):
        for oi,operator in enumerate(generator.operators):
            matrix=operator.transform.mat.tolist();translation=operator.transform.vec.tolist()
            instance=f'assembly-{assembly.name}:generator-{gi}:operator-{oi}'
            result['assemblyOperators'].append({'instanceId':instance,'sourceOperatorId':operator.name,'rotation':matrix,'translation':translation})
            mapping={};chain_rows={}
            for residue in base['residues']:
                if residue['authAsymId'] not in generator.chains and residue['labelAsymId'] not in generator.subchains:continue
                copied=copy.deepcopy(residue);copied['sourceResidueId']=residue['id'];copied['instanceId']=instance
                copied['id']=instance+':'+residue['id'];copied['instanceAsymId']=residue['authAsymId']+'@'+str(gi+1)+'.'+str(oi+1);copied['atomIndices']=[]
                mapping[residue['id']]=copied['id']
                for ai in residue['atomIndices']:
                    source=base['atoms'][ai];atom=copy.deepcopy(source);xyz=[source[k] for k in ('x','y','z')]
                    atom['sourceCoordinates']=xyz;atom['sourceChain']=source['chain']
                    for j,key in enumerate(('x','y','z')):atom[key]=translation[j]+sum(matrix[j][k]*xyz[k] for k in range(3))
                    atom['residueId']=copied['id'];atom['chain']=copied['instanceAsymId'];copied['atomIndices'].append(len(result['atoms']));result['atoms'].append(atom)
                    if len(result['atoms'])>200000:raise ValueError('Expanded assembly exceeds 200,000 protein heavy atoms.')
                result['residues'].append(copied)
                key=(copied['modelId'],copied['instanceAsymId'])
                if key not in chain_rows:chain_rows[key]={'id':f'{key[0]}:{key[1]}','modelId':key[0],'authAsymId':copied['authAsymId'],'instanceAsymId':key[1],'instanceId':instance,'residueIds':[]}
                chain_rows[key]['residueIds'].append(copied['id'])
            result['chains'].extend(chain_rows.values())
            for bond in base['disulfides']:
                if all(e['residueId'] in mapping for e in bond['endpoints']):
                    b=copy.deepcopy(bond);b['instanceId']=instance
                    for e in b['endpoints']:e['sourceResidueId']=e['residueId'];e['residueId']=mapping[e['residueId']]
                    b['source']+='; endpoints transformed by the same deposited operator; symmetry relation retained'
                    result['disulfides'].append(b)
    if not result['atoms']:raise ValueError('Selected assembly contains no supported protein coordinates.')
    result['sourceDisulfides']=base['disulfides']
    return result
