# 썸네일·시간표 에디터 전체 검토

검토일: 2026-10-06. 관리자 제작 에디터와 사용자 입력·PNG 내보내기 화면을 함께 검토했다. 기존 미커밋 변경을 포함한 현재 작업본 기준이다. 제품 코드는 변경하지 않았다. 운영 API·DB 작업은 하지 않았으며 브라우저 검증은 로컬 서버와 mock API를 사용했다.

**판단:** 새 기능 확대보다 실수로 인한 데이터 손실, 실패 후 복구, 화면·입력 일관성을 먼저 개선하는 편이 효과적이다. 시간표 v8의 공통 그래프·스타일·편집 상태 분리는 이미 반영되어 있어, 10월 4일 구조 검토 문서의 이전 지적을 그대로 반복하거나 전체 스키마를 다시 바꿀 필요는 없다.

우선순위는 P1=데이터 손실/핵심 작업 중단, P2=정확성/편집 사용성 개선, P3=생산성·발견성 개선으로 구분했다. ‘브라우저 확인’, ‘코드·로직 확인’, ‘추가 실측 필요’를 구별했다.

## 후속 반영 — 2026-10-06

사용자 요청에 따라 높은 우선순위 항목을 먼저 수정했다. 아래 본문은 최초 검토 기록이며 현재 상태는 다음과 같다.

| 검토 항목 | 반영 결과 |
| --- | --- |
| 설정창 배경 객체 삭제 | 모든 열린 모달에서 에디터 단축키를 차단. 설정창 Tab/Shift+Tab 포커스 순환, Escape 처리와 닫기 후 포커스 복귀 적용 |
| 썸네일 PNG 재시도 | 일시적 PNG 오류를 리소스 준비 오류와 분리. 실패 후 같은 화면에서 재시도 및 성공/초기화 시 오류 정리 |
| 시간표 일정 이미지 | 메모리 URL/로컬 저장/비동기 완료 대상을 entryId로 식별. 순번 이동은 최신 위치로 적용하고 삭제된 일정·이전 요청 결과는 무시 |
| JSON 가져오기 Undo | JSON 가져오기 기능 자체를 제거. 설정 버튼, 파일 input, persistence hook 진입 경로 제거 |
| Offline 일정 손실 | 모든 일정·사용자 입력 보존. Offline은 한 카드 디자인으로 표시하고 Online 복귀 시 Multi 및 기존 일정 복원. Offline Memo 및 저장 검증 연동 |
| 모바일 제작 에디터 | 데스크톱 전용으로 운영. 썸네일·시간표·팀 시간표 제작 라우트에서 모바일/태블릿을 차단하고 목록 복귀 안내. 사용자 입력·PNG 화면은 기존 범위 유지 |

검증: 타입 검사 및 전체 lint 통과(기존 경고 존재), 관련 runtime·renderer·v8 editor·settings·history·persistence 검사 통과. mock API 브라우저에서 모달 키보드 격리/포커스/JSON 버튼 제거, 데스크톱 저장·재로드, PNG 실패 후 실제 다운로드, 폰·태블릿·데스크톱 사이트 모드의 진입 차단을 확인했다. 사용자 시간표에서도 실제 파일 업로드→일정 삭제/추가 후 기존 이미지 유지, Offline→Online 입력 복원, 저장 후 새로고침의 IndexedDB 이미지 재연결을 확인했다. 운영 DB 변경과 production build는 수행하지 않았다.

추가 회귀검사 실행 명령(로컬 dev server 필요):

```sh
npm run check:studio:editor-safety:browser
npm run check:thumbnail-studio:png-retry:browser
npm run check:studio:runtime-image-context
npm run check:studio:runtime-preservation:browser
```

브라우저 검사 기본 주소는 `http://localhost:3000`이며 각각 `STUDIO_SAFETY_TEST_URL`, `THUMBNAIL_PNG_TEST_URL`, `TIMETABLE_PRESERVATION_TEST_URL`로 로컬 주소를 지정할 수 있다.

## 최초 검토: 우선 처리할 항목

| 우선순위 | 대상 | 문제 | 권장 방향 |
| --- | --- | --- | --- |
| P1 | 두 관리자 에디터 | 설정창에서 Delete가 배경 객체를 삭제 | 모달 키보드 범위와 포커스 격리 |
| P1 | 썸네일 사용자 | PNG 실패 후 재시도 버튼이 계속 잠김 | 준비 오류와 내보내기 오류 분리 |
| P1 | 시간표 사용자 | 일정 삭제 후 다른 일정 이미지 URL이 해제될 수 있음 | entryId로 이미지 식별 통일 |
| P1 | 썸네일 관리자 | JSON 가져오기 Undo가 직전 편집을 건너뜀 | 문서 교체를 이력 한 단계로 기록 |
| P1 | 시간표 사용자 | Offline 전환이 두 번째 이후 일정을 제거 | 표시 상태와 일정 보존 정책 분리 |
| P2 | 두 관리자 에디터 | 좁은 화면에서 캔버스·주요 전환 숨김 | 공통 모바일 패널과 도구 접근 경로 |
| P2 | 두 관리자 에디터 | 입력 중 Cmd/Ctrl+S가 저장하지 않음 | 저장 단축키를 입력 보호와 별도 처리 |

## 1. 설정창에서 배경 객체가 삭제됨 — P1, 브라우저 확인

- 재현: 텍스트 객체 선택 → 설정창 열기 → 자동 포커스된 닫기 버튼 상태에서 Delete → 설정창 닫기.
- 두 에디터 모두 선택 객체가 1개에서 0개로 바뀌었다. 설정창 안의 조작이 뒤의 문서 수정 명령으로 전달된다. 모달에 포커스 순환도 없어 키보드 범위를 격리하지 못한다.
- 원인: 공통 단축키는 input/textarea/select/contenteditable만 편집 대상으로 제외하며, 에디터에서 설정창 열림을 disabled 조건으로 전달하지 않는다.
- 개선: 열린 모달 내부에는 모달 명령만 전달하고 배경 편집 명령을 차단한다. 포커스 순환과 닫힌 뒤 포커스 복귀를 함께 적용한다. 저장도 모달 정책을 명시한다.
- 근거: [공통 단축키](</Users/kwakori/projects/promotion/temis/src/hooks/studio/use-studio-keyboard-shortcuts.ts:139>), [썸네일 연결](</Users/kwakori/projects/promotion/temis/src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx:1390>), [시간표 연결](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:2646>), [설정창 자동 포커스](</Users/kwakori/projects/promotion/temis/src/components/studio/settings/studio-settings-dialog.tsx:156>).

## 2. PNG 실패 뒤 재시도 불가 — P1, 코드·상태 로직 확인

- 대상: 사용자 썸네일.
- 재현 조건: 리소스 준비가 끝난 뒤 PNG 변환/이미지 재요청 등의 오류 발생.
- catch가 오류를 readiness.blockingErrors에 기록한다. 배열이 비어야 내보내기가 활성화되지만, 이후 이미지 갱신은 이미지 로딩 오류만 제거하고 초기화도 PNG 오류를 제거하지 않는다. 따라서 오류 안내가 재시도를 권해도 해당 세션에서 버튼은 잠긴다.
- 개선: 렌더 준비 상태와 exportError를 분리하고, 일시적인 내보내기 실패는 재시도 버튼을 활성화한다. 마지막 오류 안내와 재시도 진행 상태를 제공한다.
- 근거: [내보내기 준비 조건](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx:278>), [PNG catch](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx:320>), [초기화](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx:335>). 실제 PNG 오류를 주입하는 브라우저 검증은 후속 수정 시 필요하다.

## 3. 일정 삭제 후 이미지 연결 오류 — P1, 코드 확인

- 대상: 사용자 시간표의 일정별 이미지.
- 재현 조건: 일정 A(index 0), B(index 1)에 각각 이미지 업로드 → A 삭제 → B가 index 0으로 이동 → 새 C(index 1)에 이미지 업로드.
- 메모리 blob URL map은 entryIndex로 식별한다. A 삭제 뒤 map에 B의 index 1 항목이 남으며 C 업로드가 그 URL을 revoke한다. B가 계속 참조하는 이미지가 깨질 수 있다. IndexedDB는 entryId를 사용해 식별 방식도 서로 다르다.
- 개선: URL map, crop/upload 완료 결과, 로컬 저장을 모두 안정적인 entryId로 식별한다. 비동기 완료 시에도 해당 일정이 여전히 존재하는지 확인한다.
- 근거: [index 기반 키](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx:114>), [기존 URL 해제](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx:228>), [삭제 처리](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/template-studio-runtime-form.tsx:551>). 실제 runtime 삭제 함수와 동일 URL 관리 연산으로 살아남은 B의 blob URL 읽기 실패를 재현했다. 전체 파일 업로드·삭제 브라우저 시나리오는 추가 실측 필요.

## 4. JSON 가져오기와 Undo 경계 불일치 — P1, 코드·이력 로직 확인

- 대상: 관리자 썸네일.
- 재현: 문서 A에서 글자 1→2 수정 → B JSON 가져오기 → Undo. 기대한 A2 대신 A1로 돌아간다. 이전 편집이 없으면 가져오기를 Undo할 수 없다.
- 문서 교체 시 capture와 clear가 모두 없어서 이전 이력만 남는다. 시간표의 교체 경로는 직전 상태를 capture한다.
- 개선: JSON 가져오기를 한 번의 되돌릴 수 있는 작업으로 기록한다. 다른 템플릿을 열 때의 이력 초기화 정책도 두 에디터에 맞춘다.
- 근거: [썸네일 교체](</Users/kwakori/projects/promotion/temis/src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx:570>), [공통 이력](</Users/kwakori/projects/promotion/temis/src/hooks/studio/use-studio-document-history.ts:45>), [시간표 교체](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:1521>).

## 5. Offline 전환이 추가 일정을 제거함 — P1, 현재 설계의 손실 위험

- 대상: 사용자 시간표.
- 일정이 여러 개인 요일을 Offline으로 바꾸면 첫 일정만 남기고 나머지 일정·입력값을 제거한다. 다시 Online으로 바꿔도 복원되지 않는다. 실제 runtime 함수 호출에서 2→1→1을 확인했다.
- 기존 검사도 이 행동을 기대하므로 새 회귀 오류라고 단정하지 않는다. 다만 표시 토글로 보이는 조작에 삭제 효과가 있고 사용자 Undo/사전 안내가 없다.
- 개선: Offline은 렌더 상태만 바꾸고 입력을 보존하는 정책을 우선 검토한다. 삭제가 제품 요구라면 영향을 명확히 안내하고 되돌릴 수 있게 한다.
- 근거: [요일 상태 변경](</Users/kwakori/projects/promotion/temis/src/utils/template-studio/timetable-runtime.ts:266>).

## 6. 모바일에서 캔버스와 주요 도구 접근 어려움 — P2, 브라우저 확인

- 관리자 썸네일과 일반 시간표를 390×844로 검증했다. main 너비 390px에 내용 너비는 540px이며, 259px/279px 좌우 패널이 화면을 차지하고 캔버스가 밀려났다.
- 공통 셸에 모바일 패널 전환은 있지만 썸네일에서는 사용하지 않고 시간표에서는 팀 시간표에만 활성화한다.
- 상단 centerSlot은 md 미만에서 숨겨져 Undo/Redo, 시간표 Cards/Timetable 전환, 가이드 등 주요 도구의 터치 접근도 사라진다.
- 개선: 두 제작 에디터에도 레이어/캔버스/속성 전환을 적용하고, 작업 화면 전환과 Undo는 작은 화면 전용 도구 메뉴로 제공한다.
- 근거: [모바일 패널 셸](</Users/kwakori/projects/promotion/temis/src/components/studio/editor-shell/studio-editor-shell.tsx:43>), [팀 시간표 조건](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:3435>), [상단 숨김 조건](</Users/kwakori/projects/promotion/temis/src/components/studio/editor-shell/studio-top-toolbar.tsx:114>).
- 실측 이미지: [썸네일 모바일](</Users/kwakori/projects/promotion/temis/output/playwright/editor-review/thumbnail-mobile.png>), [시간표 모바일](</Users/kwakori/projects/promotion/temis/output/playwright/editor-review/timetable-mobile.png>).

## 7. 입력 중 저장 단축키가 실행되지 않음 — P2, 브라우저 확인

- 두 에디터의 Font select에 포커스를 둔 상태에서 Cmd+S를 눌렀을 때 mock 저장 요청은 0건이었다.
- shortcut resolver가 입력 대상이면 저장 단축키 판별 전에 종료한다. 브라우저 기본 저장 동작도 차단되지 않는 경로다. Ctrl+S도 같은 분기를 사용하지만 Windows에서 별도 실측하지 않았다.
- 개선: Cmd/Ctrl+S는 전역 저장 명령으로 먼저 처리하고, 글자 입력/삭제/복사/Undo 등은 입력 대상에 맡긴다. Enter/blur로 확정하는 필드가 있다면 현재 입력값이 반영된 뒤 저장하도록 검증한다.
- 근거: [입력 대상 조기 종료](</Users/kwakori/projects/promotion/temis/src/utils/template-studio/keyboard-shortcuts.ts:87>), [키 이벤트 처리](</Users/kwakori/projects/promotion/temis/src/hooks/studio/use-studio-keyboard-shortcuts.ts:151>).

## 8. 미저장 작업 보호와 저장 상태 표시 — P2, UX 개선

- 관리자 문서는 수동 저장 위주이며 dirty 표시, 임시 문서 복구, 새로고침/목록 이동 보호가 없다. 저장 성공 알림은 있지만 그 이후 문서가 바뀌었는지 구분하기 어렵다.
- 사용자 썸네일의 이미지와 달리 텍스트·날짜·선택값은 메모리에서만 갱신되어 재진입 시 기본값으로 돌아간다. 서버가 썸네일 runtime PUT을 거절하는 것은 현재 제품 설계이므로 원격 저장 자체를 요구하지 않는다.
- 개선: 관리자에는 ‘저장됨/변경사항 있음/저장 중/실패’ 표시와 작은 로컬 임시 저장을, 사용자 썸네일에는 계정·템플릿별 로컬 입력 복원과 ‘이 브라우저에 저장됨’ 안내를 제공한다. revision이 바뀌면 유효한 input만 복원한다.
- 근거: [수동 초안 저장](</Users/kwakori/projects/promotion/temis/src/hooks/studio/use-studio-template-persistence.ts:598>), [목록 이동](</Users/kwakori/projects/promotion/temis/src/app/(root)/admin/thumbnail-studio/_components/thumbnail-studio-client.tsx:1991>), [사용자 입력 state](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-shell.tsx:68>), [썸네일 서버 저장 정책](</Users/kwakori/projects/promotion/temis/src/app/api/user/templates/[id]/runtime/route.ts:277>).

## 9. 일반 이미지 배치 복원이 템플릿 구성에 따라 달라짐 — P2, 코드 확인

- user_images preset이 없는 일반 이미지 input 템플릿에서는 파일은 복원되지만 위치·크기·회전 조정은 저장되지 않는다. user_images preset이 하나라도 있으면 모든 이미지 배치 overrides를 저장한다.
- 개선: 배치 저장·복원은 preset 존재와 무관하게 수행하고, 추가 이미지 blob 처리만 preset에 따라 분기한다.
- 근거: [preset 없는 경우 조기 종료](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/use-thumbnail-user-images.ts:36>), [배치 저장 조건](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/use-thumbnail-user-images.ts:73>).

## 10. 전체 초기화의 삭제 범위와 복구 안내 — P2, UX 개선

- 사용자 썸네일 초기화는 입력·저장 이미지·이력을 즉시 지운다. 작은 화면에서는 초기화 텍스트가 숨겨지고 접근성 이름도 없다.
- 개선: aria-label을 추가하고 초기화 범위를 명시한다. 값이 변경된 경우 확인 또는 실행 직후 되돌리기 중 한 방식을 제공한다. ‘이미지 배치만 초기화’와 ‘전체 입력 초기화’도 구별한다.
- 근거: [초기화 내용](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx:317>), [초기화 버튼](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx:607>).

## 11. 요일 카드 영역 Position X/Y의 표시·저장 좌표 불일치 — P2, 코드·좌표 로직 확인

- 요일별 음수 Offset이 있는 경우 영역 X/Y에는 렌더 bounds가 표시되지만 입력값은 layout.left/top에 그대로 저장한다.
- 예: 원점 X434, Monday Offset X=-100 → 표시 X334. X1000을 입력하면 실제 표시 위치는 X900이 된다.
- 개선: 표시 좌표와 현재 bounds의 차이만큼 원점을 이동하거나, 원점 좌표를 보여주고 Grid Origin이라는 라벨로 의미를 통일한다. Custom 모드도 같은 기준을 명시한다.
- 근거: [영역 좌표 조회](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:1126>), [원점 좌표 저장](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_hooks/use-timetable-object-commands.ts:536>).

## 12. 시간표 화면의 Select 연결 요소가 Cards에 생성됨 — P2, 코드 확인

- 관리자 Timetable 화면 → Inputs → Select input → Text/Image 추가. 생성 함수는 Cards 삽입 부모를 사용하고 작업 화면을 전환하지 않는다. 결과가 현재 시간표에 보이지 않아 추가 실패처럼 느껴진다.
- 개선: 현재 작업 화면을 생성 대상으로 쓰거나 버튼을 ‘카드에 텍스트/이미지 추가’로 명시하고 해당 Cards로 이동한다. 입력 scope에 따라 사용할 수 있는 대상도 제한한다.
- 근거: [Select 버튼](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-input-inspector.tsx:250>), [생성 대상 및 화면 유지](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:2058>).

## 13. 사용자 시간표 저장 중 추가 수정 보호와 완료 피드백 — P2, 조건부 손실 위험

- 저장은 호출 당시 runtimeValues를 보내지만 입력은 계속 가능하다. 완료 후 query invalidation으로 서버 값이 새로 들어오면 initialRuntimeValues 의존 effect가 로컬 편집값을 덮어쓸 수 있다.
- 같은 GET 데이터는 React Query의 구조 공유로 동일 참조를 유지할 수 있으므로 ‘탭 복귀마다 항상 초기화된다’고 보지는 않는다. 저장 중 추가 편집이나 다른 세션/서버 값 변경을 조건으로 검증해야 한다.
- 개선: 저장 당시 snapshot과 이후 수정 여부를 비교해 최신 로컬 편집을 보존한다. 저장 완료 시점/실패/미저장 여부를 보여준다. 문서 초기화는 템플릿·revision 경계와 명시적 불러오기 중심으로 제한한다.
- 근거: [서버 값에 따른 세션 초기화](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx:168>), [snapshot 저장](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/template-studio-runtime-shell.tsx:268>), [저장 후 invalidation](</Users/kwakori/projects/promotion/temis/src/hooks/query/useTemplateStudio.ts:284>). 느린 응답을 주입하는 브라우저 실측 필요.

## 14. 이미지 비동기 처리와 초기화 순서 보호 — P2, 추가 실측 필요

- 사용자 썸네일에서 큰 파일 변환 중 초기화하거나 같은 input에 다른 파일을 연속 선택하면 이전 작업이 늦게 commit하여 초기화 뒤 이미지를 되살리거나 마지막 선택을 덮어쓸 가능성이 있다.
- 개선: input별 최신 요청 번호와 초기화 generation을 확인한 뒤 commit한다. 변환 중 상태를 표시하고 삭제·초기화 시 pending 작업을 무효화한다.
- 근거: [이미지 commit](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx:232>), [비동기 업로드](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx:270>), [초기화](</Users/kwakori/projects/promotion/temis/src/app/(root)/thumbnail/_components/thumbnail-runtime-form.tsx:317>). 코드상 경쟁 경로 확인이며 발생 빈도는 실측하지 않았다.

## 15. 시간표 편집 도구의 발견성과 생산성 — P3, UX 개선

- 요일 카드의 단일 클릭은 전체 영역, 더블클릭은 개별 요일을 선택한다. 카드 디자인 편집 버튼은 개별 요일을 선택한 뒤에만 나온다. hover 안내와 ‘요일 카드 영역 → 월요일 → 카드 디자인’ 선택 경로를 표시하면 편집 대상 구분이 쉬워진다.
- Timetable의 전체 선택/복사/잘라내기/붙여넣기/그룹 단축키는 Cards에서만 처리되어 현재 화면에서는 조용히 무시된다. 일반 객체 여러 개 이동·복사부터 지원하고, 지원 전에는 비활성 상태와 이유를 알려주는 것이 좋다.
- 근거: [요일 선택 규칙](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-preview.tsx:948>), [카드 디자인 바로가기](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/studio-timetable-inspector.tsx:355>), [작업 화면별 단축키](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/template-studio-client.tsx:2655>).

- 사용자 시간 입력은 데스크톱 분 선택이 5분 단위이고 빈 값도 00:00으로 표시되어 미지정과 자정이 구분되지 않는다. 직접 입력 또는 1분 단위 지원, “시간 미지정” 표시를 검토한다. 근거: [시간 입력](</Users/kwakori/projects/promotion/temis/src/app/(root)/template-studio/_components/runtime/ui/studio-runtime-time-picker.tsx:13>).

## 개선 순서와 완료 기준

1. **복구·데이터 보존:** 모달 명령 격리 → PNG 재시도 → 이미지 entryId 통일 → import 이력 → Offline 보존 정책. 각각 실제 실패·삭제·교체 시나리오로 검증한다.
2. **편집 흐름:** 입력 중 저장, dirty/복원, 모바일 패널, 이미지 배치 복원, X/Y 의미, Select 추가 대상. 저장·재로드 후 화면과 데이터가 일치해야 한다.
3. **편집 생산성:** 요일/영역 선택 안내, 다중 객체 작업, 상태별 사용 가능 도구 표시. 공통 셸·그래프·명령을 확장하는 작은 변경으로 진행한다.

## 검증 결과와 범위

- `npx tsc --noEmit --incremental false`: 통과.
- `npm run lint`: 종료 코드 0. 기존 경고 다수. img 관련 경고는 프로젝트의 img 사용 원칙과 별개이므로 next/image 전환 권고로 해석하지 않았다.
- 공통 검사 통과: keyboard-shortcuts, editor-store, persistence-pipeline, auto-load, operation-feedback.
- 시간표 검사 통과: selection, storage, editor-v8, graph-reads, timetable-runtime, runtime-v2-ui, timetable-layer-drag. editor-v8는 실제 명령·저장 서비스와 mock client를 검증한다.
- 썸네일 검사 통과: runtime, user-images, image-history, runtime-image-transform, editor, input-order.
- 기존 브라우저 폰트 검사: 두 에디터에서 기본 글꼴 상속·개별 설정·해제·초안 저장/재로드 통과.
- 별도 mock 브라우저 확인: 두 에디터 설정창 Delete, input focus Cmd+S, 390px 레이아웃. 브라우저 pageerror 없음.
- 제작 에디터의 실제 운영 템플릿, 사용자 이미지 업로드/PNG 실패, 모든 기기·브라우저는 실측하지 않았다. 운영 DB/API는 접근하지 않았다. production build는 프로젝트 규칙에 따라 수행하지 않았다.
- 기존 검사는 정상 경로 중심이며 위 실패 복구·모달 키보드·문서 교체 경계·index 변경을 보장하지 않는다. 정상 검사 통과와 사용성 문제 발견은 모순되지 않는다.
