"use client";

import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

import type {
  StudioRuntimeValues,
  StudioTemplateDocument,
} from "@/types/template-studio";

export interface StudioDocumentStoreState {
  /** 편집 중인 문서. 화면에 보이는 모든 것의 원본이다. */
  document: StudioTemplateDocument;
  /** 미리보기에 넣는 사용자 입력 값 */
  runtimeValues: StudioRuntimeValues;
  setDocument: (nextDocument: StudioTemplateDocument) => void;
  setRuntimeValues: (
    nextRuntimeValues:
      | StudioRuntimeValues
      | ((currentValues: StudioRuntimeValues) => StudioRuntimeValues),
  ) => void;
}

export type StudioDocumentStore = StoreApi<StudioDocumentStoreState>;

export interface StudioDocumentStoreInit {
  document: StudioTemplateDocument;
  runtimeValues: StudioRuntimeValues;
}

/**
 * 편집기 하나가 쓸 문서 store를 만든다.
 *
 * 모듈 하나에 store를 두면 같은 페이지의 편집기 두 개가 서로의 문서를 덮어쓴다.
 * 그래서 싱글톤을 만들지 않고 편집기 인스턴스마다 store를 만든다.
 *
 * `getState()`가 언제나 최신 값을 주므로 콜백 안에서 문서를 읽으려고 ref를 따로
 * 두지 않는다.
 */
export const createStudioDocumentStore = (
  init: StudioDocumentStoreInit,
): StudioDocumentStore =>
  createStore<StudioDocumentStoreState>()((set) => ({
    document: init.document,
    runtimeValues: init.runtimeValues,
    setDocument: (nextDocument) => set({ document: nextDocument }),
    setRuntimeValues: (nextRuntimeValues) =>
      set((state) => ({
        runtimeValues:
          typeof nextRuntimeValues === "function"
            ? nextRuntimeValues(state.runtimeValues)
            : nextRuntimeValues,
      })),
  }));

const StudioDocumentStoreContext = createContext<StudioDocumentStore | null>(
  null,
);

export const StudioDocumentStoreProvider = StudioDocumentStoreContext.Provider;

/**
 * 지금 편집기의 문서 store.
 *
 * 값을 구독하지 않고 store 자체를 준다. 콜백 안에서 최신 문서를 읽거나 문서를
 * 바꿀 때 쓴다.
 */
export function useStudioDocumentStore(): StudioDocumentStore {
  const store = useContext(StudioDocumentStoreContext);
  if (!store) {
    throw new Error(
      "useStudioDocumentStore는 StudioDocumentStoreProvider 안에서만 쓸 수 있다.",
    );
  }
  return store;
}

/**
 * 문서 store에서 필요한 값만 골라 구독한다.
 *
 * 고른 값이 바뀔 때만 다시 그린다. 문서 전체를 구독하면 어떤 변경에도 모든
 * 화면이 다시 그려진다.
 */
export function useStudioDocumentStoreValue<T>(
  selector: (state: StudioDocumentStoreState) => T,
): T {
  return useStore(useStudioDocumentStore(), selector);
}

/** 편집 중인 문서. */
export const useStudioDocument = (): StudioTemplateDocument =>
  useStudioDocumentStoreValue((state) => state.document);

/** 미리보기에 넣는 사용자 입력 값. */
export const useStudioRuntimeValues = (): StudioRuntimeValues =>
  useStudioDocumentStoreValue((state) => state.runtimeValues);
