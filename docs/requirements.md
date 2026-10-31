# Product requirements and shipped scope

The intended product is an English-language, offline desktop VS Code environment for researcher-led antibody inspection. Researchers should move between molecular composition, sequence numbering/CDRs, alignment, structure, developability distributions, experimental conditions and source evidence while preserving the selected molecule/region and saved observation state. Automation prepares data and mappings; the researcher decides what to observe and how to interpret it.

**v0.4.0 adds an offline guided demo, germline reference comparison, import preview and independent surface profiling. R1 is not complete.** Installation and a synthetic demonstration do not establish scientific validity. The product direction below remains in force; it was not reduced to match this implementation. Full original [v1.0 requirements](specification/requirements.original.ja.md), the [59-feature catalog](specification/feature-catalog.json), [concept dictionary](specification/concepts.json) and [source registry](specification/sources.json) are preserved in this repository. These are design sources, not runtime capabilities.

## Required research experience

1. Import sequence and structure inputs while preserving originals, stable sequence identity, molecular grouping, chain copies and missing information.
2. Inspect a molecule through linked Map, Sequence, Structure, Distributions and Evidence views in one principal workspace. Changing views preserves target context. Hover is transient; select, focus and pin have separate meanings.
3. Explain terminology through actual parts, domains, regions, interfaces and relationships. A Fab spans heavy/light chain regions; it cannot be treated as one mutually exclusive flat tag. Draw topology from actual connectivity, distinguish schematics from 3D coordinates and avoid applying IgG geometry to arbitrary formats.
4. Reach original evidence and conditions; distinguish experimental, computed, inferred, curated, user and synthetic information. Missing, not calculated, unsupported and failed are distinct states. Conflicting evidence is retained.
5. Save selection, comparison conditions, camera/layout where applicable, observations and data revisions, then resume reproducibly.

## Scientific acceptance contracts

- Keep construct, chain, immutable sequence version, domain, binding unit, antigen, specimen/lot, structure and source distinct. Repeated sequence or assay values do not justify silently merging constructs or specimens.
- Keep antibody numbering scheme, numeric position and insertion code separate; CDR definition is another explicit ID. Use 0-based half-open internal intervals in the target data model and 1-based input positions in displays. Preserve structure author/label chain and residue IDs, assembly copies and missing residues. The backwards-compatible manual-annotation fields use 1-based inclusive ranges; it must be migrated explicitly rather than relabelled.
- Record method, version, parameters, units, input/reference/model digests and preprocessing for computations. Sequence changes create a new identity and stale prior results; visual changes do not trigger recomputation.
- TAP comparisons require fixed protocol and reference-pack versions and compatible definitions/conditions. Classify comparisons exact, contextual or incompatible. Do not overlay incompatible values, average multiple Fvs into a whole-molecule score, treat missing metrics as zero, or invent an overall biological risk score. Percentiles derive from numeric ranks rather than histogram bins.
- Separate experimental and predicted structures and quality meanings. Preserve fit/evaluation regions for superposition. Contacts need a stated operational threshold (design default: minimum heavy-atom distance ≤4.5 Å), not an assertion of binding. SASA and interface areas require explicit method, probe and assembly conventions; ΔSASA and ΔSASA/2 have different labels.
- Measurements retain specimen, antigen, endpoint, unit, conditions, replicate and detection-limit operator. KD, EC50, kon and koff cannot be silently interconverted. Unknown conditions remain unknown; source tables/files stay reachable.
- Integrate local scientific engines only after license/distribution review and validation against permitted real data. Engine/model dependencies and missing resources need actionable diagnostics. Synthetic results must never enter real reference populations.

## Feature-by-feature acceptance status — 0.4.0

Partial means the complete catalog acceptance condition is not satisfied. Implemented is narrowly scoped below and is not a claim that all R1 work is done. Later-release requirements remain in the catalog.

| ID | Release | Original requirement | Implementation and remaining gap |
| --- | --- | --- | --- |
| I01 | R1 | FASTA・CSV/TSV・貼付入力 | Implemented: FASTA, quoted CSV/TSV and paste with pre-import column mapping, first-five-row preview, explicit commit and retained originals. |
| I02 | R1 | 核酸・アミノ酸の識別と翻訳対応 | Implemented: unresolved alphabet choice, explicit six-frame standard-code translation and codon mapping; original nucleotide record retained. |
| I03 | R1 | 鎖ペアと分子のグループ化 | Partial: typed constructs with distinct chain-copy IDs and explicit sequence links, roles and specimen relationships; general binding-unit connectivity remains incomplete. |
| I04 | R1 | 重複・断片・未知残基の確認 | Partial: duplicate, gap, unknown/stop checks and domain detection; no explicit fragment classification. |
| I05 | R2 | AIRR・NGS・クローン情報 | Absent. No usable implementation in this version. |
| M01 | R1 | 鎖・ドメイン・定常領域の検出 | Partial: ANARCII variable domains; supported human CL/CH reference matching with alternatives. Hinge/foreign fusion detection incomplete. |
| M02 | R1 | クラス/κλ/形式/完全性の多軸分類 | Partial: H/K/L and constant-reference hits are separate from explicit construct/role metadata; no complete multidimensional classifier. |
| M03 | R1 | Fab/scFv/Fc融合/複数Fvの構成 | Partial: multiple/scFv variable domains, explicit H/L groups and Fab/Fv combined selections; arbitrary Fc fusion/connectivity absent. |
| M04 | R1 | 視覚用語辞典と意味に応じた拡大 | Partial: region tracks and cross-chain Fv/Fab selections link to sequence/structure focus; full concept dictionary/navigation absent. |
| M05 | R2 | 糖鎖・修飾・ADC・融合部分 | Absent. No usable implementation in this version. |
| Q01 | R1 | 番号付けとCDR定義 | Implemented IMGT and Kabat numberings with independently selected IMGT/Kabat CDR definitions, insertion codes and original-input round trips. Other schemes are not provided. |
| Q02 | R1 | 抗体番号に基づくアラインメント | Partial: domain-selectable homologous IMGT alignment with insertion columns and population inspection. Cross-input domains currently use the same selected domain index; arbitrary mixed-format correspondence remains incomplete. |
| Q03 | R1 | CDR抽出・長さ・組成 | Implemented: selectable IMGT/Kabat definitions update CDR extraction, length, composition and original sequence ranges. |
| Q04 | R1 | 生殖細胞系列候補と由来類似性 | Implemented amino-acid reference similarity: independent V/J candidates, species selection, identity/coverage, tied-best counts, differences and provenance. Explicitly not a V(D)J or species-origin assignment. |
| Q05 | R1 | 位置ごとの残基頻度・保存性 | Implemented: numbered-domain alignment shows entropy; clicking a position exposes residue counts/frequencies, missing count, duplicate policy and the exact input-record population. |
| Q06 | R2 | canonical loop・VH/VL配置 | Absent. No usable implementation in this version. |
| Q07 | R1 | 完全一致・類似配列・領域検索 | Implemented collection-local text/sequence search, duplicate detection and selected-region local BLOSUM62 similarity search, with coverage, aligned-column identity, original ranges and input digests. |
| Q08 | R2 | 多様性・クラスタ・系統の観察 | Absent. No usable implementation in this version. |
| S01 | R1 | PDB/mmCIFと鎖の対応 | Partial: PDB/mmCIF, author/label IDs, insertion codes, model IDs, conservative mapping and missing-residue handling. Deposited assembly operators expand to distinct copy IDs, retaining source author/label IDs and transforms. |
| S02 | R1 | 局所選択・距離・表現切替 | Implemented for displayed model 0: linked residue selection, focus, sticks/lines/cartoon and two-atom distances in angstroms. |
| S03 | R1 | 構造品質・予測信頼度の層 | Implemented numeric quality layer with explicit field semantics and observed scale: experimental B-factor versus prediction ensemble dispersion; no inferred pLDDT or PAE. |
| S04 | R1 | 重ね合わせと領域別比較 | Implemented for uniquely mapped chain instances: C-alpha Kabsch with independent framework/CDR/CDR3/current/all fit and evaluation selections; transform/counts/ranges/input indices retained. Ambiguous repeated copies require future explicit copy selection. |
| S05 | R1 | SASA・接触・ジスルフィド | Partial: minimum-heavy-atom contacts, Shrake-Rupley SASA, labeled delta/half-delta areas and source-annotated disulfide connectivity. Symmetry mates are not expanded. |
| S06 | R1 | ローカルFv/VHH予測 | Partial: optional ImmuneBuilder four-model CPU ensemble, ANARCII input preparation, explicit model download/checksums and OpenMM refinement. Integration validation is recorded separately; no full antibody or complex prediction. |
| S07 | R2 | モデル群・PAE・可動性の観察 | Absent. No usable implementation in this version. |
| B01 | R1 | 抗原の登録と対応 | Partial: typed antigen registry with sequence IDs, species, modifications and source links; measurement antigen fields are retained but not a complete assay relationship graph. |
| B02 | R1 | 複合体接触・界面観察 | Partial: real complex contacts and chain-pair interface areas; deposited assembly selection is available; curated interface annotation remains incomplete. |
| B03 | R1 | 親和性・kinetics・活性の取り込み | Partial: endpoint-preserving experimental table import; assay/antigen graph and kinetics fitting absent. |
| B04 | R2 | epitope bin・競合・変異/HDX情報 | Absent. No usable implementation in this version. |
| B05 | R2 | パラトープ/エピトープ予測 | Absent. No usable implementation in this version. |
| D01 | R1 | 理論MW/pI/電荷/疎水性 | Implemented for entire standard-AA chains: average reduced/free-terminus MW, pI, charge at pH 7.4 and GRAVY with conditions. Other scopes require a derived input. |
| D02 | R1 | 化学的liabilityと構造文脈 | Partial: explicitly motif-only liabilities linked to sequence and structure selections; structure-aware reaction modeling absent. |
| D03 | R1 | TAP指標と版固定ヒストグラム | Partial: five published numerical TAP2 distributions for 664 clinical / 79,759 natural paired Fvs, with source digest and provenance. Official candidate metric engine is not included. User confirmed no commercial SAbBox license and requested an alternative: independent surface-profile v1 computes isolated-chain hydrophobic/charge-class SASA and connected patches with explicit provenance. It never populates TAP metrics or compares against TAP thresholds. |
| D04 | R1 | 複数の参照集団と比較条件 | Partial: fixed working-cohort histograms and multiple imported fixed reference histograms; comparison compatibility function tested but full overlay UI absent. |
| D05 | R1 | 発現・安定性・凝集・非特異結合の実験値 | Partial: arbitrary experimental endpoints with specimen/lot/concentration/buffer/temperature/source; structured assay registry absent. |
| D06 | R2 | 凝集/溶解性/粘度/自己会合等の予測 | Absent. No usable implementation in this version. |
| H01 | R1 | 人源性の評価・参照比較 | Partial: validated local promb human OASis overlapping 9-mer identity per variable domain, matched/total counts and selectable unmatched windows, fixed reference digest. No allele assignment or immunogenicity inference. Additional humanness methods absent. |
| H02 | R2 | MHC-II等の免疫原性関連注釈 | Absent. No usable implementation in this version. |
| F01 | R1 | Fc/hinge/CLの観察と番号対応 | Partial: selected human CL/CH reference matches with source intervals; hinge and EU/IMGT constant numbering absent. |
| F02 | R2 | Fc受容体・補体・半減期関連 | Absent. No usable implementation in this version. |
| F03 | R2 | 糖鎖・DAR・結合部位の実測 | Absent. No usable implementation in this version. |
| E01 | R1 | 構成体と試料・ロットの分離 | Implemented distinct specimen entities with construct links, lot and conditions, an editor, and exact measurement specimen-ID links. Equal names or sequences never merge specimens. |
| E02 | R1 | 単位・反復・検出限界・条件 | Implemented on table import: units, replicates, censoring operators and conditions retained; unknowns explicit. |
| E03 | R1 | 論文・DB・特許・ファイルの出所 | Partial: original sequence/table/structure sources, reference URLs/digests and typed editable source entities with citation/URI/license; automated bibliography lookup absent. |
| E04 | R1 | 実験・計算・注釈の比較 | Partial: inferred/computed/experimental/manual evidence distinct, no automatic averaging; condition-aware comparison workflow absent. |
| K01 | R1 | ローカル参照パックと版固定 | Partial: local pack import validates version/source/license/protocol/denominator/missing data; no pack discovery/update manager. |
| K02 | R1 | 統合検索・別名・ID解決 | Partial: local name/sequence/note/construct search with immutable record IDs; general alias resolution absent. |
| K03 | R2 | 既知抗体/文献の類似探索 | Absent. No usable implementation in this version. |
| U01 | R1 | hover/select/focus/pinの統一 | Partial: linked selection/focus/pin and no hover camera movement; unified cross-view hover and arbitrary typed targets incomplete. |
| U02 | R1 | 保存した観察状態・履歴・メモ | Partial: snapshots, notes, camera/ranges/pins/inputs and automatic recovery; complete revision graph and historical engine/reference resolution absent. |
| U03 | R1 | 図・表・配列・条件の出力 | Partial: FASTA, JSON report/project, structure PNG+metadata and CSV property/measurement/surface-profile tables; vector figures absent. |
| U04 | R1 | キーボード/色覚/テーマ/空状態 | Partial: keyboard tabs and residue navigation, visible labels, selection outlines, empty/error states and responsive evidence drawer. Renderer checks cover light/dark themes at three widths; screen-reader and color-vision audits remain outstanding. |
| U05 | R1 | 視覚的な知識の段階表示 | Partial: domain explanations and explicit evidence inspector; full progressive concept encyclopedia absent. |
| X01 | R1 | オフライン導入・更新・診断 | Partial: local CPU workers, diagnostics, version-locked Windows runtime installer. First install requires network; offline distribution bundle absent. |
| X02 | R1 | 背景実行・取消・キャッシュ | Implemented background queue, cancel, per-record errors/retry and bounded integrity-checked content-addressed calculation cache keyed by inputs, parameters and implementation/reference fingerprints. Prediction and OASis evaluation are excluded from this cache. |
| X03 | R1 | 拡張の共通出力契約 | Partial: local JSON-RPC worker and structured evidence outputs; extensible validated plugin contract not implemented. |
| X04 | R1 | 入力変更と結果の版管理 | Partial: original/digest validation prevents stale sequence analysis; translation creates new IDs; full input revision/dependency invalidation graph absent. |
| Z01 | R3 | 変異・人源化案と系譜 | Absent. No usable implementation in this version. |
| Z02 | R3 | docking/MD/de novoへの接続 | Absent. No usable implementation in this version. |
