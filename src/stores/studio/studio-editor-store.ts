"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import type {
  StudioInputId,
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";
import { resolveStudioSelection } from "@/utils/template-studio/selection";

/**
 * 되돌리기 한 단위가 되돌리는 값.
 *
 * 문서만 되돌리면 화면이 문서와 어긋난다. 예를 들어 노드를 지운 뒤 되돌렸을 때
 * 그 노드가 다시 선택돼 있어야 속성 패널이 같은 것을 보여준다. 그래서 문서와
 * 선택을 한 덩어리로 묶는다.
 *
 * 이 모양은 store의 상태 일부와 정확히 같다. 그래서 복원은 store에 그대로
 * 덮어쓰는 일이 된다.
 */
export interface StudioEditorSnapshot {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  /** 속성 패널이 보여줄 기준 노드 */
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  /** Inputs 패널에서 고른 입력 */
  selectedInputId: StudioInputId | null;
  /** 미리보기가 보여줄 요일 */
  selectedRuntimeDayId: string;
  /** 미리보기가 보여줄 일정 순번 */
  selectedRuntimeEntryIndex: number;
}

export interface StudioEditorStoreState<
  TView extends object = object,
> extends StudioEditorSnapshot {
  /**
   * 편집기별 뷰 설정.
   *
   * 되돌리기가 되살리지 않는 값이다. 그래서 스냅샷에 들어가지 않는다. 어떤
   * 값이 있는지는 편집기가 정한다. 탭 이름이나 인스펙터 섹션처럼 편집기마다
   * 다른 낱말을 쓰기 때문이다.
   */
  view: TView;
  /** 뷰 설정의 일부를 바꾼다. 직전 값을 받아 바꾸는 형태도 쓸 수 있다. */
  setView: (
    patch: Partial<TView> | ((currentView: TView) => Partial<TView>),
  ) => void;
  setDocument: (nextDocument: StudioTemplateDocument) => void;
  setRuntimeValues: (
    nextRuntimeValues:
      | StudioRuntimeValues
      | ((currentValues: StudioRuntimeValues) => StudioRuntimeValues),
  ) => void;
  /**
   * 선택을 바꾼다.
   *
   * 문서에 없는 노드는 걸러낸다. 기준 노드가 목록에 없으면 마지막 노드를
   * 기준으로 삼는다.
   */
  setSelection: (
    nodeIds: readonly string[],
    primaryNodeId?: string | null,
  ) => void;
  /**
   * 검사 없이 선택을 덮어쓴다.
   *
   * 이력 복원처럼 문서와 선택을 함께 갈아끼울 때만 쓴다. 아직 store에 들어가지
   * 않은 문서를 기준으로 걸러내면 방금 되살린 노드가 선택에서 빠진다.
   */
  replaceSelection: (
    nodeIds: readonly string[],
    primaryNodeId: string | null,
  ) => void;
  setSelectedInputId: (inputId: StudioInputId | null) => void;
  setSelectedRuntimeDayId: (dayId: string) => void;
  setSelectedRuntimeEntryIndex: (entryIndex: number) => void;
  /** 되돌리기 한 단위를 한 번에 덮어쓴다. */
  restoreSnapshot: (snapshot: StudioEditorSnapshot) => void;
}

export type StudioEditorStore<TView extends object = object> = StoreApi<
  StudioEditorStoreState<TView>
>;

export interface StudioEditorStoreInit<TView extends object = object> {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
  /** 편집기별 뷰 설정의 처음 값. */
  view: TView;
  /** 처음 고를 노드 */
  selectedNodeIds?: string[];
  selectedInputId?: StudioInputId | null;
  selectedRuntimeDayId?: string;
  selectedRuntimeEntryIndex?: number;
}

/** 값 복제. 되돌리기가 지난 상태를 잡고 있어야 하므로 사본을 만든다. */
const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * 지금 상태에서 되돌리기 한 단위를 떠낸다.
 *
 * 이후 편집이 이 값을 건드리지 않도록 문서와 런타임 값을 복제한다.
 */
export const captureStudioEditorSnapshot = (
  state: StudioEditorSnapshot,
): StudioEditorSnapshot => ({
  document: cloneJson(state.document),
  runtimeValues: cloneJson(state.runtimeValues),
  selectedNodeId: state.selectedNodeId,
  selectedNodeIds: [...state.selectedNodeIds],
  selectedInputId: state.selectedInputId,
  selectedRuntimeDayId: state.selectedRuntimeDayId,
  selectedRuntimeEntryIndex: state.selectedRuntimeEntryIndex,
});

/**
 * 편집기 하나가 쓸 store를 만든다.
 *
 * 모듈 하나에 store를 두면 같은 페이지의 편집기 두 개가 서로의 문서를 덮어쓴다.
 * 그래서 싱글톤을 만들지 않고 편집기 인스턴스마다 store를 만든다.
 *
 * `getState()`가 언제나 최신 값을 주므로 콜백 안에서 값을 읽으려고 ref를 따로
 * 두지 않는다.
 */
export const createStudioEditorStore = <TView extends object>(
  init: StudioEditorStoreInit<TView>,
): StudioEditorStore<TView> =>
  createStore<StudioEditorStoreState<TView>>()((set, get) => ({
    document: init.document,
    runtimeValues: init.runtimeValues,
    view: init.view,
    selectedNodeIds: init.selectedNodeIds ?? [],
    selectedNodeId: init.selectedNodeIds?.at(-1) ?? null,
    selectedInputId: init.selectedInputId ?? null,
    selectedRuntimeDayId: init.selectedRuntimeDayId ?? "mon",
    selectedRuntimeEntryIndex: init.selectedRuntimeEntryIndex ?? 0,

    setView: (patch) =>
      set((state) => ({
        view: {
          ...state.view,
          ...(typeof patch === "function" ? patch(state.view) : patch),
        },
      })),

    setDocument: (nextDocument) => set({ document: nextDocument }),

    setRuntimeValues: (nextRuntimeValues) =>
      set((state) => ({
        runtimeValues:
          typeof nextRuntimeValues === "function"
            ? nextRuntimeValues(state.runtimeValues)
            : nextRuntimeValues,
      })),

    setSelection: (nodeIds, primaryNodeId) => {
      const nodes = get().document.graph.nodes;
      const resolved = resolveStudioSelection(
        nodeIds,
        primaryNodeId,
        (nodeId) => Boolean(nodes[nodeId]),
      );

      set({
        selectedNodeIds: resolved.nodeIds,
        selectedNodeId: resolved.primaryNodeId,
      });
    },

    replaceSelection: (nodeIds, primaryNodeId) =>
      set({ selectedNodeIds: [...nodeIds], selectedNodeId: primaryNodeId }),

    setSelectedInputId: (inputId) => set({ selectedInputId: inputId }),

    setSelectedRuntimeDayId: (dayId) => set({ selectedRuntimeDayId: dayId }),

    setSelectedRuntimeEntryIndex: (entryIndex) =>
      set({ selectedRuntimeEntryIndex: entryIndex }),

    restoreSnapshot: (snapshot) =>
      set({
        document: cloneJson(snapshot.document),
        runtimeValues: cloneJson(snapshot.runtimeValues),
        selectedNodeId: snapshot.selectedNodeId,
        selectedNodeIds: [...snapshot.selectedNodeIds],
        selectedInputId: snapshot.selectedInputId,
        selectedRuntimeDayId: snapshot.selectedRuntimeDayId,
        selectedRuntimeEntryIndex: snapshot.selectedRuntimeEntryIndex,
      }),
  }));

/**
 * 뷰 설정의 모양은 편집기마다 다르므로 context에는 담지 않는다.
 *
 * 자식이 뷰 값을 읽어야 하면 편집기가 자기 타입으로 좁힌 훅을 만들어 준다.
 */
const StudioEditorStoreContext = createContext<StudioEditorStore | null>(null);

export const StudioEditorStoreProvider = StudioEditorStoreContext.Provider;

/**
 * 지금 편집기의 store.
 *
 * 값을 구독하지 않고 store 자체를 준다. 콜백 안에서 최신 값을 읽거나 상태를
 * 바꿀 때 쓴다.
 */
export function useStudioEditorStore(): StudioEditorStore {
  const store = useContext(StudioEditorStoreContext);
  if (!store) {
    throw new Error(
      "useStudioEditorStore는 StudioEditorStoreProvider 안에서만 쓸 수 있다.",
    );
  }
  return store;
}

/**
 * store에서 필요한 값만 골라 구독한다.
 *
 * 고른 값이 바뀔 때만 다시 그린다. 상태 전체를 구독하면 어떤 변경에도 모든
 * 화면이 다시 그려진다.
 */
export function useStudioEditorStoreValue<T>(
  selector: (state: StudioEditorStoreState) => T,
): T {
  return useStore(useStudioEditorStore(), selector);
}

/** 편집 중인 문서. */
export const useStudioDocument = (): StudioTemplateDocument =>
  useStudioEditorStoreValue((state) => state.document);

/** 미리보기에 넣는 사용자 입력 값. */
export const useStudioRuntimeValues = (): StudioRuntimeValues =>
  useStudioEditorStoreValue((state) => state.runtimeValues);

/** 뷰 값 하나를 바꾸는 함수. React의 setState와 같은 모양이다. */
export type StudioViewSetter<TValue> = (
  value: TValue | ((currentValue: TValue) => TValue),
) => void;

/**
 * 뷰 값 하나만 바꾸는 함수를 만든다.
 *
 * React의 setState와 같은 모양이라 값을 그대로 넣거나 직전 값을 받아 바꾸는
 * 형태를 모두 쓸 수 있다. 덕분에 상태를 store로 옮겨도 쓰는 쪽 코드가 바뀌지
 * 않는다.
 */
export const createStudioViewSetter =
  <TView extends object, TKey extends keyof TView>(
    store: StudioEditorStore<TView>,
    key: TKey,
  ): StudioViewSetter<TView[TKey]> =>
  (value) => {
    store.getState().setView(
      (currentView) =>
        ({
          [key]:
            typeof value === "function"
              ? (value as (currentValue: TView[TKey]) => TView[TKey])(
                  currentView[key],
                )
              : value,
        }) as unknown as Partial<TView>,
    );
  };
