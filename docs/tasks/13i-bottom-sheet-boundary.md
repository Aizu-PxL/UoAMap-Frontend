# 13i — BottomSheetのURL・drag境界を整理

## GOAL

`BottomSheet` のイベント固有URL依存を `expandRequestKey` propへ置換し、22/58/82svhのdrag・clamp・nearest・double-click計算を純粋化する。pointer captureされたdrag-zoneのhandlerへmove/終了処理を一本化し、window listenerの重複を削除する。

## 参照

- `docs/SPEC.md` §2、§3.4、§5.2
- `.agent/refactor-plan.md` M5
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/app/AppLayout.tsx`

## やること

- snap points、初期値、clamp、drag換算、nearest、double-clickの次点計算を純粋モジュールへ抽出する。
- `BottomSheet` から `useSearchParams()` とhighlight知識を除去し、`expandRequestKey` 変更時に初期スナップ以上へ展開する。
- AppLayoutがlocation.searchからhighlight値を読み、`expandRequestKey` として渡す。
- pointerdownでcaptureしたdrag-zoneのpointermove/up/cancelだけを使い、windowの重複listenerを削除する。
- 22/58/82svh、clamp、同距離時に低いsnapを選ぶ現行規則、double-click循環を維持する。

## SCOPE

- `src/components/bottom-sheet/bottomSheetGeometry.ts`
- `src/components/bottom-sheet/bottomSheetGeometry.test.ts`
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/app/AppLayout.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13i-bottom-sheet-boundary.md`

BottomSheetのDOM/CSS、navigation、SearchPanel、highlight scroll、URL形式、pointer gesture追加は対象外。

## 受入基準

- 22/58/82svhのclamp、drag換算、nearest、同距離tie、double-click循環を固定する。
- expand requestは22を58へ上げ、58/82を縮めない。
- BottomSheetからReact Router importとhighlight知識を除去する。
- AppLayoutがhighlight値を `expandRequestKey` として渡す。
- window pointer listenerを削除し、drag-zoneのcapture済みhandlerだけでdragを完了する。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxでdrag/clamp/snap、double-clickの22→58→82→22、highlightによる22→58展開、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/components/bottom-sheet/bottomSheetGeometry.ts` と5件のcharacterization testを追加した。
- BottomSheetからRouter/highlight知識を除去し、AppLayoutから `expandRequestKey` を渡す境界へ変更した。
- window pointer listenerを削除し、capture済みdrag-zoneのmove/up/cancel handlerへ集約した。
- `bun test`: 76 tests / 454 assertions PASS
- `bun run build`: PASS
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `git diff --check`: PASS
- 幅402pxで実DOMのdouble-click 58→82→22→58、地図マーカー `highlight=P22` による22→58展開、console error 0件を確認した。ブラウザ操作APIが連続pointer dragを公開していないため、drag換算・上下clamp・nearest/tie・snapは純粋テストで確認した。
- 独立レビュー: 会話履歴なしの読み取り専用レビューで指摘なし。
