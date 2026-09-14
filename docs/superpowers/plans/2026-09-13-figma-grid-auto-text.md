# GRID Figma Auto Text Classification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma 링크로 가져오는 GRID 카드에서 `main_title`, `sub_title`, `offline_memo` 텍스트를 일반 Text가 아닌 Auto Text(`flexibleText`)로 분류·변환한다.

**Architecture:** Auto Text 판정은 Figma `textAutoResize` metadata가 아니라 명시적인 GRID semantic layer alias와 기존 role 분류를 기준으로 한다. 서버 review가 classifier의 타입 결과를 다시 덮어쓰지 않게 하고, 기존 converter가 review의 `suggestedStudioType`을 graph node에 반영하는 경로를 회귀 테스트로 고정한다.

**Tech Stack:** Next.js/React, TypeScript, existing Figma GRID importer, existing review fusion and graph converter, repository check scripts.

**Spec:** 사용자 승인 범위와 현재 Figma GRID importer audit. `weeklyMemo`/`artistProfileText` 전역 composition import는 별도 범위로 제외한다.

## Global Constraints

- `main_title`, `sub_title`, `offline_memo`만 이번 변경의 Auto Text 대상이다.
- `weekly_memo`, `artist_text`, `weeklyMemo`, `artistProfileText`는 이번 변경에서 일반 Text/기존 처리로 유지한다.
- `time`, `day_label`, `date`, `status_label`은 Figma auto-resize metadata가 있어도 `text`로 유지한다.
- `main_title`/`sub_title` binding은 기존 `entry.main_title`/`entry.sub_title`을 유지하고, `offline_memo`는 기존 `day.offline_memo` binding을 사용한다.
- 새 runtime input, composition object, DB migration, 기존 저장 문서 backfill은 추가하지 않는다.
- 사용자 수동 review에서 타입을 Text로 바꾸는 기존 기능은 유지한다.
- 모든 하위 에이전트와 리뷰 에이전트는 `gpt-5.6-luna` 모델과 `medium` reasoning effort만 사용한다.
- 검증은 `node --import tsx` 기반 관련 check, `npm run lint`, `npx tsc --noEmit`를 사용하며 production build와 원격 DB 변경은 하지 않는다.

---

### Task 1: GRID Auto Text classifier와 review 경로 정합성

**Files:**

- Modify: `src/types/template-studio-figma.ts`
- Modify: `src/utils/template-studio/figma-import/figma-text-classifier.ts`
- Modify: `src/services/server/figmaGridReviewService.ts`
- Modify: `src/components/studio/settings/studio-figma-component-import.tsx`
- Test: `scripts/check-template-studio-figma-import.ts`
- Test: `scripts/check-studio-figma-component-import.tsx`

**Interfaces:**

- `StudioFigmaNodeReviewRole` gains only `offline_memo`; no weekly/artist roles are added.
- `classifyFigmaTextNode()` returns `flexibleText` for explicit `main_title`, `sub_title`, and `offline_memo` aliases, while preserving existing bindings.
- `ruleReview()` uses the classifier's `studioType` when no placement semantic candidate overrides it.

- [ ] **Step 1: Add failing classifier and review assertions**

  Add assertions for `offline_memo`, Korean/English alias normalization, and the negative cases `weekly_memo` and `artist_text`. Also assert that a server rules-only review and an AI disagreement cannot turn an explicit GRID Auto Text target into `text`.

- [ ] **Step 2: Run the focused check and confirm the failure is the missing Auto Text behavior**

  ```bash
  node --import tsx scripts/check-template-studio-figma-import.ts
  ```

  Expected: FAIL because `offline_memo` is not a recognized role and the review service hardcodes non-title text as `text`.

- [ ] **Step 3: Implement the minimal classification contract**

  Normalize and match explicit aliases for `offline_memo`; make `main_title`, `sub_title`, and `offline_memo` return `flexibleText`; map `offline_memo` to `day.offline_memo`; keep weekly/artist aliases out of the target set. Make the server candidate use `classification.studioType` instead of a title-only conditional. Add the offline-memo role to the review schema, prompt, and review UI binding option.

- [ ] **Step 4: Run the focused checks and confirm they pass**

  ```bash
  node --import tsx scripts/check-template-studio-figma-import.ts
  node --import tsx scripts/check-studio-figma-component-import.tsx
  ```

  Expected: PASS, with ordinary time/day/date/status cases still resolving to `text`.

- [ ] **Step 5: Commit the classifier/review change**

  ```bash
  git add src/types/template-studio-figma.ts src/utils/template-studio/figma-import/figma-text-classifier.ts src/services/server/figmaGridReviewService.ts src/components/studio/settings/studio-figma-component-import.tsx scripts/check-template-studio-figma-import.ts scripts/check-studio-figma-component-import.tsx
  git commit -m "fix: classify GRID memo text as auto text"
  ```

### Task 2: Imported graph end-to-end regression coverage

**Files:**

- Modify: `scripts/check-template-studio-figma-import.ts`
- Modify: `scripts/check-studio-figma-component-import.tsx`
- Inspect: `src/utils/template-studio/figma-import/figma-node-converter.ts`
- Inspect: `src/utils/template-studio/figma-import/figma-component-import.ts`

**Interfaces:**

- `convertFigmaGridVariant()` remains the graph conversion boundary; it must consume the effective review type without a new schema.
- `applyStudioFigmaGridCandidate()` remains responsible for validation/ID remapping only; it must not create inputs or composition objects for excluded weekly/artist fields.

- [ ] **Step 1: Extend the converter fixture with all in-scope GRID text nodes**

  Add main title, sub title, and offline memo nodes to the online/offline origin fixture and assert that every converted in-scope graph node is `flexibleText` with the expected builtin binding. Add weekly memo and artist text fixture nodes as explicit negative cases and assert they remain the existing non-target type.

- [ ] **Step 2: Run the end-to-end importer check**

  ```bash
  node --import tsx scripts/check-template-studio-figma-import.ts
  ```

  Expected: PASS after Task 1; the check must inspect the converted graph, not only review metadata.

- [ ] **Step 3: Keep the import panel contract covered**

  Render a candidate with all in-scope review rows and assert that Auto Text is displayed for them, `day.offline_memo` is selectable, and excluded weekly/artist rows do not receive an Auto Text default.

- [ ] **Step 4: Commit the end-to-end regression coverage**

  ```bash
  git add scripts/check-template-studio-figma-import.ts scripts/check-studio-figma-component-import.tsx
  git commit -m "test: cover GRID auto text import parity"
  ```

### Task 3: Final verification

**Files/commands:**

- `node --import tsx scripts/check-template-studio-figma-import.ts`
- `node --import tsx scripts/check-studio-figma-component-import.tsx`
- `node --import tsx scripts/check-template-studio-auto-text.tsx`
- `npm run lint`
- `npx tsc --noEmit`
- `git diff --check e9732e48..HEAD`

- [ ] **Step 1: Run all Figma and Auto Text checks**
- [ ] **Step 2: Run lint and typecheck, separating pre-existing warnings/errors from changed-file diagnostics**
- [ ] **Step 3: Inspect the final diff to confirm no weekly/artist runtime or migration scope was introduced**
- [ ] **Step 4: Record any environment-only verification blocker without claiming it passed**

## Acceptance Criteria

- [ ] GRID Figma `main_title`, `sub_title`, and `offline_memo` review results default to `flexibleText`.
- [ ] Converted graph nodes for those three fields are `flexibleText` in both relevant variants and preserve their existing bindings.
- [ ] `weekly_memo` and `artist_text` remain outside this change and are not promoted by the classifier.
- [ ] Time/day/date/status text remains ordinary `text` even when Figma layout metadata is flexible.
- [ ] Manual review can still override the imported type.
- [ ] Existing Figma importer and Auto Text checks remain green.

## Non-goals

- Importing or generating `weeklyMemo`/`artistProfileText` composition objects.
- Creating or linking global input definitions for weekly memo or artist text.
- Migrating already-saved incorrect Figma imports.
- Changing Thumbnail Studio or legacy `/time-table` import behavior.
