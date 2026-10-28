# 抗体研究・Visual Inspection統合環境 — 体系要件・実装仕様 v1.0

日付：2026-10-29／形式：デスクトップVS Code拡張／原則：ローカル完結、研究者による観察・解釈  
状態：設計仕様。実際の抗体解析エンジン・製品は未実装。性能、配布可否、科学計算の一致は実装時の検証対象。

## 1. 製品の定義

抗体に関する情報を、同じ分子、鎖、部位、抗原、試料、実験、文献へ結び付けて観察する研究環境を作る。研究者は配列を入口に、分子構成、局所の特徴、構造、相互作用、開発適性、実験結果、既知情報を行き来できる。

Visual Inspectionを第一原理とする。自動化の責務は、整理、対応付け、注釈、計算、参照条件の準備である。何に着目し、どう解釈するかは研究者が決める。

「すべての情報を集約する」は、あらゆる情報を関連付けられる共通の格納・検索・表示先を持つという要件とする。個々の情報は、ローカル計算、ローカルファイル取込み、許可済み参照パック、研究者の注釈で充足する。原データを持たない情報は出典への参照として保持し、取得済み・未取得・利用制限を表示する。情報の存在と、それを自動推定できることは別に管理する。

日常の完成体験：
1. 配列や構造を取り込むと、分子の構成、対応関係、情報の不足が整う。
2. 一覧から気になる対象を選び、全体像・配列・構造・分布・実験を同じ文脈で観察する。
3. 用語の意味は図の範囲・配置・関係から確認する。
4. 根拠に到達し、観察条件とメモを保存し、翌日その状態から再開する。

## 2. 網羅性点検の方法と限界

既存のv0.2を、研究工程、情報の単位、観察操作、一次資料/公式機能の四つの軸で点検した。検索範囲は抗体の取得・配列確認、候補比較、抗原との相互作用、物性、人源性、定常領域、実験、参照知識、日常運用を含む。

資料は29件の一次論文・公式仕様・公式実装/製品説明を採用する。参照先と採用理由はsources.jsonに記録。製品説明は機能存在の根拠として使い、精度や需要規模の証拠には使わない。

本点検は研究者全体への需要調査ではない。機能の必要性と優先順位は、資料に見られる研究作業とユーザーの目的を統合した設計判断である。標準利用者による操作検証をリリース条件にする。

### 2.1 前案の不足と再構成

| 研究上の問い | v0.2の状態 | 本仕様での位置づけ | 根拠 |
| --- | --- | --- | --- |
| この配列は何を含むか | 整理済み | 核酸・AA・完全性・鎖/試料IDまで統合 | S05,S09,S10 |
| 何と比較すると特徴が分かるか | 主に基準配列とTAP | 生殖細胞系列、位置頻度、既知抗体、多様性 | S09,S11,S16 |
| 抗原にどう関係するか | 後段の扱い | 抗原・複合体・接触・実験値を主要領域へ | S14,S15 |
| 物性はどうか | TAP中心 | 化学的変化、自己会合、非特異結合、安定性、実測 | S01–S04 |
| 局所のモデルを信頼できるか | 一部記載 | 構造品質、欠損、assembly、予測信頼度を横断表示 | S18 |
| ヒトらしさはどこにあるか | 次段階 | 参照類似性・人源性を観察情報として導入 | S09,S12 |
| Fc/hinge/糖鎖はどうか | 構成把握が中心 | 既知変化、定常領域、修飾と実験機能を関連付け | S08 |
| 同じ抗体でも測定が異なる理由は何か | 試料単位が不足 | 構成体・試料・ロット・条件を分離 | S04,S29 |
| 既知情報はどこにあるか | DB参照が中心 | 文献、測定、由来、別名、関連ファイルの統合検索 | S16,S17 |
| 用語と実体はどう対応するか | 表形式が中心 | 分子構成図・ドメイン配置・意味に応じた拡大 | S06,S07 |
| 日々の観察をどう続けるか | 保存方針あり | スナップショット、履歴、復元、軽量描画を具体化 | S20,S21 |

### 2.2 再利用判断に関わる発見

PDVは、公式資料上、単一HTMLでオフライン動作する構造観察環境であり、選択、配列表示、計測、保存を備える。ローカル構造観察という機能自体は既存資産にある。公式資料には非商用/商用の利用条件も記載されるため、内部コードを無条件に取り込む前提にはしない。[S20]

本製品で新しく統合すべき中心は、配列から始まる候補群の整理、分子構成と専門概念、参照分布、実験・試料・文献の対応、各画面に共通する観察状態である。

## 3. 情報体系

### 3.1 研究情報の領域

1. **同定・入力品質**：原配列、核酸/AA、鎖ペア、ドメイン、由来、完全性。
2. **配列と多様性**：番号、CDR/FR、整列、差分、遺伝子候補、位置頻度、クローン。
3. **立体構造**：モデル、品質、欠損、重ね合わせ、表面、距離、接触。
4. **抗原・結合**：抗原種/isoform/構成体、接触、epitope/paratope、親和性、競合、活性。
5. **開発適性**：TAP、化学的liability、安定性、発現、凝集、非特異性、粘度等。
6. **人源性・免疫原性関連**：参照への近さ、人源性、別手法のHLA関連注釈。
7. **定常領域・分子形式**：Fc/hinge/CL、既知変化、受容体作用、糖鎖、融合/結合体。
8. **実験・試料**：構成体、試料ロット、発現系、測定条件、反復、検出限界。
9. **参照知識**：既知抗体、文献、DB、特許由来情報、用語と定義。
10. **観察と再現**：選択、比較条件、メモ、履歴、図・表・根拠の保存。

各領域は独立したツール画面に分割せず、共通対象に関連する情報として表示する。

### 3.2 根拠の種類

全情報にevidenceKindを付ける。
- experimental：実験測定・実験的な観察。
- computed：指定手法で計算された値。
- inferred：配列・構造等からの推定。
- curated：文献/DBで整理された情報。
- user：研究者による指定・観察メモ。
- synthetic：開発用の架空データ。本番参照集団への混入を禁止。

情報がないこと、計算していないこと、対象外であること、失敗したことを分ける。情報源が競合する場合は両方を保持し、優先表示の理由を残す。

### 3.3 集約する対象

construct（設計された分子）、chain（構成鎖）、sequence（不変の配列版）、domain、binding_unit（Fv等）、antigen、specimen（試料）、structure、sourceを基本対象とする。

同一配列の再利用、同一構成体の異なる試料、同じ試料の複数条件の測定を分離する。参考例としてJainらの実験では、可変領域を共通IgG1形式で測定しており、元の薬剤と実験試料を区別する必要がある。[S04]

## 4. 機能要件と段階

機能ID、入出力、表示先、受入条件、根拠をfeature-catalog.jsonの59件で管理する。以下は構成の索引。

| 領域 | 要件ID | 初期実用版R1 | 拡張R2以降 |
| --- | --- | --- | --- |
| 入力と品質 | I01–I05 | AA/核酸、CSV、鎖対応、重複・断片確認 | AIRR/NGS深度・クローン |
| 分子構成・用語 | M01–M05 | 多軸分類、構成図、部位と用語の連動 | 修飾・ADC等の詳細 |
| 配列比較 | Q01–Q08 | 番号、CDR、整列、遺伝子候補、頻度、局所検索 | canonical、配置、多様性 |
| 構造 | S01–S07 | 取込み、品質、選択、重ね合わせ、SASA/接触、予測 | モデル群・PAE等 |
| 相互作用 | B01–B05 | 抗原、複合体接触、測定値の取込み | 競合/HDX/epitope推定 |
| 開発適性 | D01–D06 | 基本値、liability、TAP分布、実測の表示 | 追加予測モデル |
| 人源性 | H01–H02 | 人源性・参照比較 | MHC-II等の追加手法 |
| 定常領域 | F01–F03 | Fc/hinge/CLと既知変化 | 機能測定・糖鎖/DARの専用表示 |
| 証拠と参照 | E01–E04,K01–K03 | 試料、条件、出所、ローカル検索 | 大規模類似探索 |
| 操作と基盤 | U01–U05,X01–X04 | 連動、保存、出力、オフライン、拡張契約 | 必要に応じた規模拡張 |
| 任意設計 | Z01–Z02 | 共通データで結果を受け取れる | 変異設計、MD、docking等 |

R1は複数の実装区切りから成る実用版であり、短期の小さな試作と同義ではない。情報モデルは最初から全領域を収容し、専用の計算器は段階的に導入する。各領域の優先度は「表示と取込み」「新規計算」を分けて判断する。

R0は工学的な縦断試作。架空データでの画面動作を科学解析の完成と扱わない。R1公開には利用可能な実データの検証とローカル解析経路の確立が必要。

## 5. 科学的な表示の契約

### 5.1 分類

Igクラス、サブクラス、軽鎖型、形式、由来類似性、特異性、完全性を別軸として保持する。VHのみからクラスを決めない。複数Fvの検出と、異なる抗原に結合することの証明を分ける。由来生物の類似性とhumanized等の設計履歴も別情報。

入力FASTAの2行を物理的なH2L2と同一視しない。ユニークな配列と会合体のコピーを分け、図の各コピーから元配列へ戻れるようにする。

### 5.2 座標と整列

内部区間は0-based half-open [start0,end0)。表示は元配列の1-based位置。抗体番号はscheme、position、insertionを独立に保存する。CDR定義は番号付けとは別ID。構造はmodel、assembly instance、label/auth鎖ID、label/auth残基番号、挿入コードを保持する。

番号変換は実残基IDを経由する。整列列は別の表示座標であり、残基のIDとして使わない。欠損、未知残基、ギャップ、未入力は異なる状態。配列編集時は新しいsequence IDを作り、既存の解析を変更しない。

### 5.3 物性・liability

理論MWの対象は未修飾配列等の明示条件で定義する。pI、電荷、疎水性には方式・末端・pH等を記録する。配列モチーフの存在は実際の反応・修飾・発生率とは区別する。

LAPの文脈情報を参考に、生殖細胞系列、参照抗体での出現、構造上の露出を並べて観察する。[S03] 独自の恣意的な総合危険度を自動生成しない。

### 5.4 TAPと参照分布

2019/2024等のprotocol IDと、参照パックの版を固定する。[S01,S02] 指標、単位、番号/CDR定義、構造生成、前処理、対象形式、参照群が一致するかを比較前に確認する。

比較適合性は exact（定義上同条件）、contextual（条件差あり）、incompatible（重ね合わせ不適）の3段階。contextualの結果は参考表示として別の記号にする。incompatibleは同じ分布へ重ねない。exactは同一精度や実験的妥当性を保証する語ではない。

TAPの5指標を同時に見渡せる。参照集団と作業対象群のフィルターを分離する。κ/λ別の分布と検証されたしきい値の有無を分ける。分位は数値順位から計算しビン幅に依存させない。参照パックには分母単位、除外条件、重複規則、欠測数、元ファイルdigestを含める。

複数Fvは各Fvで表示し、平均して全分子のTAP値としない。VHH等への適用は対応手法がある場合に限定する。構造未計算は0で埋めない。残基寄与を実装が出さない指標は、計算対象領域のみ示す。

### 5.5 構造と界面

- 実験構造と予測構造を別のoriginとして表示する。
- B因子、pLDDT、FAPE等はそれぞれの定義と単位を持つ。
- 重ね合わせはfit領域、評価領域、原子集合、対応数を保存する。
- 接触の標準表示案：指定2集合間の非水素原子最短距離 ≤4.5 Å。しきい値はUIで変更可能。これは操作上の初期値であり結合の証明ではない。
- SASAは手法、原子半径、probe radius、assembly、欠損処理を固定。
- 界面面積の表示はΔSASA=SASA(A)+SASA(B)−SASA(AB)を基本とし、片側面積ΔSASA/2とラベルを分ける。A/Bは同じ座標と前処理から切り出す。
- ジスルフィドはファイルにある結合情報と距離候補を分ける。
- CDR、接触残基、推定パラトープ、実測エピトープは別レイヤー。
- 結晶の非対称単位、biological assembly、研究者指定構成を区別する。
- ローカルFvモデルを全長・複合体の構造として描かない。

### 5.6 実験

測定はspecimen、antigen、endpoint、unit、condition、replicate、operatorを持つ。KD、EC50、kon、koff、活性、非特異結合を区別する。検出限界の「<」「>」を保持し、正確な測定値として平均しない。温度、pH、buffer、濃度、抗原構成、測定法等が不明ならunknownを保持する。

条件をまたぐ統合は研究者が指定したルールで行う。単位換算は同一物理量に限定し、相異なるendpointの変換をしない。生データや原表へ戻れる。

## 6. 視覚的な情報体系

### 6.1 用語を配置と関係で理解する

Conceptを、部位（part）、ドメイン（domain）、配列領域（region）、断片（fragment）、界面（interface）、形式（format）、クラス（isotype）、軽鎖型（lightchain）、由来（origin）、機能（function）に分類する。用語はこの意味種別を持ち、平坦なタグ一覧へ混在させない。

| 概念 | 視覚表現 | 選択後の連動 |
| --- | --- | --- |
| H/L鎖 | 連続する鎖の経路と短いラベル | 原配列・コピー関係 |
| VH/VL/CH/CL | ドメインの連なり | 該当配列範囲と構造 |
| Fab/Fv/Fc | 複数ドメインにまたがる括り | 含まれる鎖の複数区間 |
| CDR/FR | 可変ドメイン内の帯・ループ | 定義と番号・差分 |
| hinge/linker | 接続区間と線上のラベル | 実際の配列、未解像状態 |
| epitope/paratope | 抗体と抗原の接触面を対向表示 | 接触表と根拠 |
| IgG1/κ/λ等 | 対応する分類軸の小さな属性欄 | 判定根拠と関連する領域 |
| 二重特異性等 | 結合単位の所属・相手への関係 | 抗原/実験情報 |

図は実際のドメイン接続から生成する。IgG用のY字図をscFvへ使い回さない。既知の構成をテンプレート配置できるが、未知構成は配列順のドメイン図にフォールバックする。配列だけから生成した図には構成模式図と表示し、3D座標と区別する。

FabはVH/CH1とVL/CLにまたがる範囲、FvはVH/VLの範囲として選択できる。[S06] Fc/hingeの境界は採用定義を表示する。図の部分が重複する概念は別レイヤーとして重ね、排他的区画として誤表示しない。

### 6.2 意味に応じて拡大する

全体構成 → 鎖 → ドメイン → CDR/FR → 残基 → 原子/近傍を段階表示する。どの段階でも小さな全体図と位置表示を残す。用語に触れると該当範囲が光り、選択すると同じ対象を配列と構造で表示する。

説明は「短い名称＋部位の強調＋必要な一文＋根拠」の順。詳しい定義は展開する。ラベルをなくすことを目的にせず、図と名称を同じ場所で覚えられるようにする。

### 6.3 視覚ルール

- 通常は中立色。H/LやCDR種別には固定した少数の色とラベル。
- 科学的スカラー色（電荷、信頼度等）は一つずつ適用し、凡例を必ず表示。
- 選択は輪郭/下線を併用し、科学的な色分けを上書きしすぎない。
- 未確定は明示ラベルと部分的な点線、欠損は空き/斜線で区別。
- 希少性と不良判定を同じ赤色で表さない。
- タンパク質らしい装飾図ではなく、実データに対応した表示を優先。
- ロゴや模式図は配色を選べるが、出力の凡例と設定を残す。


## 7. 画面仕様

### 7.1 画面の枠組み

一つの主要Webviewを開き、左に対象一覧、中央に観察面、右に根拠の詳細を置く。VS Codeのサイドバーはプロジェクト入口・最近の観察に限定し、大きな科学表示を複数Webviewへ分断しない。

上部にはパンくず（コレクション → 分子 → 鎖/結合単位 → 部位）、検索、保存を置く。状態欄に実行場所と背景処理を短く表示する。通常の研究作業でAPI、Python環境等を見せず、環境診断時だけ表示する。

主要観察面：
- Map：分子構成と知識の位置づけ。
- Sequence：整列と注釈。
- Structure：構造と相互作用。
- Distributions：参照分布と指標。
- Evidence：試料、測定、文献、メモ。

同じ分子・部位の選択を保ったまま切り替える。2面比較を任意に開けるが、通常は中央一面と詳細欄だけを表示する。複数構造比較は同期カメラを選べる。

幅1440pxの設計目安：一覧220px、詳細300px、中央は残り。幅1180px未満では詳細欄を引出し式にし、980px未満では一覧も折り畳む。分割幅は保存可能。これはデザイン初期値であり固定幅の強制ではない。

### 7.2 初期表示と情報量

初回は例題とファイル取込みの二つの入口。取込み後は対象一覧と構成図を示す。最初から未計算指標の大量のカードを並べない。入力済みの情報と、観察に必要な追加処理を文脈内に表示する。

一覧の初期列は名前、形式、軽鎖型、入力範囲、CDR長、構造の有無。用途別の列セットを保存できる。根拠・情報量を表す集計を「総合品質スコア」にしない。

### 7.3 インタラクション契約

| 操作 | 状態変更 | 禁止する副作用 |
| --- | --- | --- |
| hover（短い待ち約200ms） | transientHoverのみ | カメラ移動、永続化、再計算、フィルター変更 |
| クリック/Enter | selectedTargetsを置換 | 参照集団の変更 |
| Ctrl/Cmd＋クリック | 選択へ追加/解除 | 他の比較条件の変更 |
| Shift＋選択 | 同じ表示座標内の範囲を追加 | 別鎖の無関係な残基へ拡張 |
| Focus | focusTargetとview変換 | 選択の破棄 |
| Pin | 注釈IDをpinnedEvidenceへ追加 | 原データの書換え |
| 分布の範囲選択 | selected対象群を更新 | 参照分布の再計算 |
| Filter | collectionQueryを更新 | 参照集団の変更 |
| 参照集団変更 | comparisonContextを更新 | 自抗体の生の計算値の変更 |
| Back/Forward | navigationSnapshot復元 | 元データの更新 |
| Save view | SavedView作成 | 原配列の変更 |

Undo/Redoは注釈編集・設定変更へ適用し、観察の戻る/進むと別履歴にする。結果更新で新しい行を自動挿入してスクロール位置を飛ばさず、更新通知後に反映する。

### 7.4 空状態・失敗

missing input、not requested、queued、running、ready、not applicable、failed、staleを文脈に沿って表示する。例：軽鎖未入力、構造未計算、モデル未導入、参照パック未導入、形式に非対応。

エラーには対象、原因、使える既存結果、再試行方法を添える。番号付け失敗で元配列の表示まで消さない。専門用語の分からないエラーコードだけを表示しない。

### 7.5 アクセシビリティ

主要操作はキーボードでも実行可能。ホバー情報は選択後に詳細欄から読める。視覚用語図には対応する階層テキストを用意する。色と文字/線種を併用。ライト/ダーク、高コントラスト、アニメーション低減に対応する。

### 7.6 デザイン仕様

本文13–14px、補助情報12px、配列は等幅14pxを初期値とする。余白は4/8/12/16/24px系列。表の行高は通常32px、密表示28px。大きな装飾、過剰な影、半透明の重なりを避け、配列と図の読取りを優先する。

ドメイン色、残基種別色、物性連続色を別の表示モードとして管理する。選択時も凡例の意味を保つ。図の出力には配色、範囲、尺度、定義を付記する。

## 8. データ契約

機械可読の正本はcontracts/*.schema.json。参照整合性等はverification/check_contracts.pyでも確認する。JSON Schemaだけで配列長・外部キー・科学的整合性は保証できないため、三段階の検証を行う。
1. JSONの型・必須項目・列挙値。
2. ID、範囲、単位、参照・版の整合性。
3. 科学的な既知データとの一致。

### 8.1 基本対象と保存

| 対象 | 最低限の項目 |
| --- | --- |
| Sequence | ID、alphabet、residues、digest、原ファイルへの参照 |
| Construct | ID、chain ID群、形式情報、evidence ID |
| Chain | ID、sequence ID、construct ID、役割 |
| Domain | ID、chain ID、start0/end0、kind、evidence |
| BindingUnit | ID、domain ID群、pairingState、evidence |
| Antigen | ID、sequence ID群、organism/isoform/context |
| Specimen | ID、construct ID、lot、expression/condition |
| Structure | ID、asset digest、origin、assembly policy |
| Source | ID、kind、title、URIまたは相対asset path、version、digest |
| Annotation | ID、target、concept ID、evidence kind、source、値と状態 |
| MetricResult | 定義ID、対象、status、value/unit、protocol/context fingerprint、source |
| Observation | 試料、抗原、endpoint、operator、value/unit、condition、反復、source |
| ReferencePack | 版、指標定義、対象単位、cohort、checksum、利用条件 |
| SavedView | 対象選択、比較文脈、layout、camera、pins、メモ、data revision |

すべての不変IDは表示名と分ける。同名を主キーにしない。sequence digestの一致は重複配列の検出に使うが、construct/specimenの統合条件にはしない。

### 8.2 共通のTargetRef

対象参照はentityId、任意のchainIdと区間、任意のstructure residue locatorで表す。複数鎖にまたがるFab等はTargetRef配列で表現する。保存時にentityとchainの所属を検証する。

構造locatorsにはmodelId、instanceId、labelAsymId、authAsymId、labelSeqId、authSeqId、insertionCodeを持たせる。assemblyのコピーを区別し、ラベル番号がない場合はnullとして著者番号を保持する。

### 8.3 指標と比較のfingerprint

計算キャッシュkey：
SHA256(canonical JSON of input digests + engine ID/version + model hash + parameter values + numbering/CDR definition + reference pack hash + preprocessing + seed + relevant runtime identity)

UIの色や表の並びは計算keyへ含めない。比較context keyは指標定義・protocol・単位・対象形式・構造/前処理条件から作る。乱数種やGPUの差異を再現性metadataとして保持し、異なる環境で完全にbitwise一致するとは保証しない。

結果を変更せず、最新入力との一致状態を別管理する。staleな結果は参照できるが、新計算値と既定で混ぜない。

### 8.4 実験データ

Observationは定量値と定性値に対応する。operatorはeq、lt、le、gt、ge、between、qualitative。betweenでは上限が必須。定量値には単位または無次元の明示が必要。元の文字列と換算後の値を両方保存する。

反復は各観測を保存し、集約値に元観測IDを付ける。品質除外は削除ではなくフラグ。条件不明な値を空の条件と同一条件として自動結合しない。

### 8.5 視覚概念辞書

concepts.jsonは用語名、意味種別、短い説明、所属/包含/重なり関係、対応するdomain selector、模式図表現、出典を持つ。

図の形は概念の意味を説明するが、対象分子にその領域が存在するかは実際のannotationで判定する。辞書の一般的なIgG図と、入力分子の実体図を混同しない。

## 9. 実行構成とAPI

### 9.1 採用する構成案

- TypeScriptのVS Code拡張：入口、ファイル許可、環境管理、worker lifecycle。
- 一つのWebview＋React：共通store、仮想化した表/配列、構成図、分布、詳細。
- Mol*を構造表示の第一候補とし、選択API接続を先に実証。3Dmol.jsは性能・複雑度比較の代替候補。
- Python worker：既存解析器をadapterで実行。重いモデルは別の子process。
- SQLite＋ローカルasset：単独writerとトランザクション。初期は独立したgraph DBを使わない。
- スキーマで定義した出力から、列、track、structure layer、分布を生成する。

SQLはstorage/schema.sql。共通entityとtyped payload、外部キー付き関係表、sequence、annotation、metric、observation、job、saved_viewを用いる。payloadの型検証はschemaで行う。

### 9.2 プロセス間通信

UI⇄extensionはVS Code message passing。extension⇄workerはstdin/stdout上のJSON-RPC 2.0、1行1JSONとする。文字列中の改行はJSONエスケープする。診断ログはstderrへ出す。1メッセージ上限は暫定4MiB。大きな構造・行列はasset IDとdigestで渡す。

基本method：
- engine.describe：capability、版、依存、資源。
- project.importPreview：入力検証、列/鎖候補。
- project.importCommit：検証済みの取込みを確定。
- analysis.plan：必要処理、キャッシュ、対象外、推定資源。
- job.submit / job.cancel / job.status。
- result.query：対象・field・cursor指定で部分取得。
- asset.readChunk：許可済みassetの範囲取得。
- view.save / view.load。
- export.create：明示範囲の出力。

error code例：INPUT_INVALID、PAIRING_UNRESOLVED、ENGINE_MISSING、OUT_OF_SCOPE、REFERENCE_MISMATCH、RESOURCE_LIMIT、CANCELLED、DATA_REVISION_CONFLICT。原例外は診断用に保持し、画面には対応可能な説明を返す。

### 9.3 ジョブ状態

queued → running → succeeded / partial / failed  
queued/running → cancelling → cancelled  
依存不足はblocked、異常終了したrunningはinterruptedに回復する。

進捗は分かる単位でcount/totalを返し、未知の所要時間に架空の百分率を付けない。1対象の失敗はbatch全体の失敗と分離する。結果は一時領域へ書き、checksum検証後に原子的に登録する。取消後に遅れて届いた結果は対象job attemptと照合する。

### 9.4 選択イベント

共通イベントにはeventId、originView、viewRevision、kind、targetsを持つ。kindはhover/select/focus/pin。UI内だけで処理する操作はworkerへ送らない。受信元へ同じイベントを反射させない。hoverは保存しない。

結果の遅延到着はdataRevisionとrun IDを照合し、別の抗体へ切替済みなら現在の画面を上書きしない。

### 9.5 計算依存

取込み → 配列QC/鎖対応 → ドメイン/番号 → 整列/領域注釈/軽い物性  
確定したFv + 環境 → 構造予測 → 構造QC/残基対応 → SASA/接触/TAP  
実験取込み → 単位/試料/抗原照合 → 観察表/分布  
全結果 → 定義照合 → 比較可能性 → 表示

CDRの表示方式変更だけで構造予測をやり直さない。入力配列変更では依存結果をstaleにする。参照集団の切替でTAPの生指標を再計算しない。

## 10. 解析器・データの再利用方針

| 機能 | 第一候補 | 接続方法 | 実装前に確定すること |
| --- | --- | --- | --- |
| 番号付け | ANARCII/AbNumber | adapter | 精度、速度、OS、版差、配布条件 |
| 複数可変領域・注釈 | RIOTを比較候補 | adapter | 非商用等の条件、対象範囲 |
| germline | IgBLAST等 | CLI | AA/核酸での機能差と参照パック |
| 定常領域 | curated reference＋alignment/HMM | adapter | gene/allele範囲、境界と評価 |
| 構造解析 | Mol*＋Gemmi/BioPython等の候補 | 共通mapping | mmCIF・assembly・コピー対応 |
| SASA | FreeSASA | adapter | probe/半径/出力の一致 |
| Fv/VHH構造 | ImmuneBuilder等 | adapter | 対応形式、CPU速度、モデル配布 |
| TAP | 許諾済み実装/検証済み実装 | adapter | 正式protocolとの一致、利用条件 |
| 人源性 | BioPhi/OASis等 | adapter | DB容量、版、分子形式 |
| パラトープ | Paragraph等 | adapter | 適用対象・モデル条件 |
| 知識・参照 | Thera-SAbDab/PLAbDab/IMGT等 | ローカルpack | データ利用・再配布・更新の条件 |

CLIの出力を画面へ直接流さず、共通schemaへ変換する。ツールが出力しない情報を推定で埋めない。製品全体のライセンスと、各コード・重み・DBの利用条件を別に管理する。商用利用を保証する記載は、採用版と配布方法を確認してから行う。

## 11. ローカル運用と非機能要件

### 11.1 導入

本体は軽いVSIX、解析runtimeはOS別pack、モデル/DBは任意packに分離する。基本の研究操作にターミナル入力を要求しない。モデルを使うときだけ導入画面を開き、容量、条件、対応OS、必要RAM/VRAMを示す。

最初のengineering targetはLinux x64とする提案。利用者向け初期targetはWindows 11 x64とmacOS arm64を候補にし、実機検証で対応版を確定する。未検証OSを対応済みと記載しない。手動Conda/Dockerを唯一の導入経路にしない。

### 11.2 オフライン・プライバシー

全UI資材を同梱し、CDNを利用しない。初回または明示的更新だけで参照packを準備でき、オフライン取込み経路を用意する。配列・構造・ログを外部送信しない。telemetryは初期無効。外部リンクを開くこととデータ送信を分ける。

保証対象は本拡張と同梱解析系。VS Code本体、他拡張、同期フォルダは別管理。remote workspaceを検知し、実行場所を表示し、ローカル保証モードでは透過的remote実行を停止する。

### 11.3 安全な実装

Webview CSP、入力文字列のescape、受信message schema検証、許可済みasset pathのみの読込みを必須化。shell文字列へ入力を連結せずspawn(args)を使用する。workspace内の実行設定を自動実行しない。第三者adapterは信頼済みのものだけ有効化し、process分離をセキュリティsandboxと同一視しない。

### 11.4 性能予算

基準候補：4コア以上、RAM16GB、SSD、GPUなし。実機/OS/model版を固定し、未達は記録する。

| 操作 | 暫定受入目標 |
| --- | --- |
| 既存データのhover/select | p95 100ms以内、hoverの意図待ち時間を除く |
| 構成図/候補表の初期表示 | runtime準備済みで3秒以内 |
| 100抗体の番号/軽い指標 | warmで10秒を目標、モデルロード別 |
| 1万候補一覧 | 仮想化、入力応答100ms以内。全候補の同時計算を含めない |
| 配列表示 | viewportに必要な行/列を描画 |
| 5万原子構造の初回表示 | 3秒目標、shader初回等は別記 |
| 基本閲覧の追加RAM | 合計1GBを目標、任意モデル別 |
| 取消 | 1秒以内に受付、5秒以内の停止を基本目標 |
| バックグラウンド計算 | UIのスクロール・メモ・保存を停止しない |

構造・行列は遅延読込み。配列行ごとに全残基DOMを常時生成しない。ホバーで計算器を呼ばない。WebGL context数を制限し、非表示paneを解放する。モデルは必要時にロードしidle unloadできる。結果更新は差分配信し、不要な全体描画を避ける。

## 12. 受入検証と実装順序

### 12.1 科学的な受入

番号、CDR境界、挿入、欠損、複数ドメイン、κ/λ、未知配列、構造コピーを含む固定データで検証する。エンジン単独実行とadapter経由を同一入力・版・条件で照合する。TAPの参照データを読み込み、公開例の値と許容差を決めて比較する。

試料/条件の紐付け、単位換算、検出限界、重複の扱いは手で確認できる小例で検証する。参照集団の再抽出と図の再現は、元データ・除外条件まで往復検証する。

### 12.2 操作の受入

- Fab→Fv→VH→CDRと選択し、全体位置を見失わない。
- IgGからscFvへ切替え、別形式の図と正しいドメイン連動を得る。
- 配列/構造/分布/実験を切り替えて選択が維持される。
- 表を絞り込んでも参照群が変わらない。
- 結果が遅れて届いても別対象を上書きしない。
- 保存したカメラ、比較条件、注釈、メモが復元される。
- ネットワーク遮断下で入力→解析→観察→出力を完了する。
- 研究者が根拠の種類と未確定部分を見分けられる。

初期ユーザビリティ試験は、配列中心、構造中心、実験中心の役割から各2名程度を提案する。これは需要頻度の統計的調査ではなく、重大な操作障害の発見を目的にする。作業成功率、誤対応、迷い、初回と翌日の再開時間を記録する。

### 12.3 実装順序

1. E00：schema・ID・座標・用語辞書・固定例。
2. E01：入力/QC・保存・鎖/分子対応。
3. E02：構成図・一覧・共通選択・視覚用語。
4. E03：番号付け/領域/整列/参照比較。
5. E04：構造読込み・対応・品質・選択。
6. E05：指標registry・参照pack・5分布。
7. E06：ローカル予測/TAP経路・科学的一致。
8. E07：実験/試料/抗原/文献の接続。
9. E08：接触・表面・重ね合わせ・人源性。
10. E09：snapshot/export・回復・OS配布・オフライン検証。
11. E10：利用者による観察課題検証。
12. E11以降：R2の深い解析、R3の任意設計。

E02の画面を先に完成させても、E03/E04の正しい残基対応なしに実用版としない。E06が未解決なら配列からTAPまで完成したと表記しない。工数はチーム・OS・ライセンスで変わるため、backlog.jsonでは依存関係と相対規模のみ示す。

## 13. 今回の成果物と未検証事項

成果物：
- 本書：点検結果、体系要件、科学的契約、UX/UI、実装仕様。
- feature-catalog.json：59件の入出力・受入条件・根拠。
- sources.json：29件の一次/公式資料。
- concepts.json：視覚用語と関係。
- contracts/：project、engine、view state、共通UI eventのJSON Schema。
- storage/schema.sql：SQLiteの初期DDL。
- fixtures/：架空の契約例と、失敗すべきケース。
- examples/：adapter、計算結果/通信例。
- backlog.json：実装区切りと依存関係。
- verification/：構造・不変条件・SQLの検証スクリプトと結果。
- 会話中の画面案：操作の連動を確認する合成データの試作。

未検証：研究者全体の需要頻度、解析エンジンの組込み、モデル精度、実データでのTAP再現、採用版の配布許諾、OS別runtime配布、製品性能。本書の性能値は目標であり測定結果ではない。今回の画面案は構成模式図で、3D分子viewerや実際の抗体判定を実装したものではない。JavaScript構文は検査済みだが、この環境ではブラウザー実行環境を準備できなかったため、描画・操作のブラウザー検証は未実施。

## 14. 出典索引

出典一覧を以下に掲載する。機械可読版はsources.jsonを参照。各要件のsource_idsから対応資料へたどれる。引用した機能の存在から市場全体の要求率を推定せず、本製品への採否は本書の設計判断として扱う。


| 出典ID | 資料 | 採用した論点 |
| --- | --- | --- |
| S01 | [TAP 2019](https://pmc.ncbi.nlm.nih.gov/articles/PMC6410772/) | Fvの参照指標・分布。実装定義と参照集団の版を固定する |
| S02 | [TAP 2024](https://www.nature.com/articles/s42003-023-05744-8) | 更新された構造・参照分布、κ/λの比較。配布・データ条件は別途照合 |
| S03 | [LAP 2024](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1011881) | モチーフを生殖細胞系列・治療用抗体・構造の文脈で調べる |
| S04 | [Jain et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5293111/) | 複数の物性測定と、共通IgG1形式で測定した試料の区別 |
| S05 | [IMGT/mAb-DB](https://imgt.org/mAb-DB/doc.action) | 形式・由来・特異性・Fc情報を別軸で管理 |
| S06 | [IMGT Fragment](https://www.imgt.org/IMGTindex/fragment.php) | Fab/Fv/Fcなどの区画と鎖・ドメインの関係 |
| S07 | [IMGT CDR/FR](https://www.imgt.org/IMGTScientificChart/Nomenclature/IMGT-FRCDRdefinition.html) | 番号・領域定義・長さ |
| S08 | [IMGT engineered Fc variants](https://www.imgt.org/IMGTbiotechnology/IGHG_variant/Tableau1.html) | Fcの既知変化と作用を参照情報として扱う |
| S09 | [IgBLAST](https://ncbi.github.io/igblast/) | 核酸・タンパク質入力と生殖細胞系列の照合 |
| S10 | [AIRR rearrangement schema](https://docs.airr-community.org/en/stable/datarep/rearrangements.html) | 鎖・配列・接合部・遺伝子候補・由来IDを保持 |
| S11 | [abYsis](https://www.chemogenomix.com/abysis) | 位置特異的な残基分布・番号付け・配列/構造比較 |
| S12 | [BioPhi](https://github.com/Merck/BioPhi) | 人源性・人源化。結果の文脈とローカル実行 |
| S13 | [SCALOP](https://opig.stats.ox.ac.uk/webapps/sabdab-sabpred/sabpred/scalop/scalop_example) | 対応するCDRのcanonical form。H3を同列の分類対象にしない |
| S14 | [Paragraph](https://github.com/oxpig/Paragraph) | パラトープ推定を実測接触・CDRと区別 |
| S15 | [IEDB B-cell tools](https://tools.iedb.org/main/bcell/) | 抗原上のエピトープ情報と予測の別管理 |
| S16 | [Thera-SAbDab](https://opig.stats.ox.ac.uk/webapps/sabdab-sabpred/therasabdab/about) | 治療用抗体と対応する構造の参照 |
| S17 | [PLAbDab](https://opig.stats.ox.ac.uk/webapps/plabdab/about/) | 文献・特許由来の配列/構造の参照 |
| S18 | [RCSB validation](https://www.rcsb.org/docs/general-help/deposition-resources) | 構造全体・局所の品質と実験根拠 |
| S19 | [FreeSASA](https://freesasa.github.io/) | 溶媒露出の計算候補。定義と条件を固定 |
| S20 | [PDV](https://pdv.naturalantibody.com/docs/docs.html) | ローカル構造観察、選択、計測、セッション。再利用はライセンス確認が必要 |
| S21 | [Jalview linked views](https://www.jalview.org/help/html/features/annotation.html) | 配列・構造・行列の対応選択 |
| S22 | [ANARCII](https://github.com/oxpig/ANARCII) | 番号付け候補。ANARCIと版を区別 |
| S23 | [RIOT](https://github.com/NaturalAntibody/riot_na) | 複数可変領域の注釈候補。利用条件を確認 |
| S24 | [Mol* selection API](https://molstar.org/docs/v5/plugin/selections/) | 構造表示と対象選択の接続 |
| S25 | [VS Code Webview](https://code.visualstudio.com/api/extension-guides/webview) | 画面とメッセージ連携 |
| S26 | [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host) | ローカル/リモート実行場所 |
| S27 | [ImmuneBuilder](https://github.com/oxpig/ImmuneBuilder) | ローカルFv/VHH構造予測候補 |
| S28 | [IEDB MHC-II](https://tools.iedb.org/mhcii/) | HLAとペプチド長を指定したMHC-II結合予測。免疫原性の別要素 |
| S29 | [FLAb](https://github.com/Graylab/FLAb) | 多種類の抗体実験データと各データセットの文脈 |
