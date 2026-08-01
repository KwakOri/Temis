import type {
  StudioBinding,
  StudioGraphNodeType,
  StudioImageFit,
  StudioStyleRecord,
} from "@/types/template-studio";

/**
 * 레이어 트리와 추가 메뉴가 쓰는 아이콘 이름.
 *
 * 아이콘 컴포넌트 자체는 담지 않는다. registry는 순수 값이어야 순수 함수 가드가
 * 값으로 검증할 수 있고, 서버에서 불러도 React를 끌어오지 않는다.
 */
export type StudioNodeIconKey =
  "group" | "text" | "autoText" | "image" | "shape";

/**
 * 노드 종류가 허용하는 인스펙터 섹션.
 *
 * 우측 패널이 어떤 섹션을 보여줄지 종류별로 정한다. 이것이 없으면 도형에
 * 글꼴 크기 칸이 나오고 사용자는 바꿔도 아무 일이 없는 칸을 만지게 된다.
 */
export type StudioNodeInspectorSection =
  | "transform"
  | "layout"
  | "appearance"
  | "text"
  | "image"
  | "shape"
  | "group"
  | "binding";

export interface StudioNodeSize {
  width: number;
  height: number;
}

export interface StudioNodeDefinition {
  type: StudioGraphNodeType;
  /** 레이어 트리와 속성 패널 머리말에 쓰는 짧은 이름. */
  label: string;
  /** 추가 메뉴에 쓰는 이름. 무엇이 만들어지는지 풀어 쓴다. */
  addMenuLabel: string;
  iconKey: StudioNodeIconKey;
  /** 새로 넣을 때의 기본 크기. */
  defaultSize: StudioNodeSize;
  /** 자식을 가질 수 있는 종류. group만 참이다. */
  allowsChildren: boolean;
  inspectorSections: readonly StudioNodeInspectorSection[];
  /** 새 노드의 기본 style. 호출마다 새 객체를 준다. */
  createDefaultStyle: () => StudioStyleRecord;
  /**
   * 새 노드의 기본 binding.
   *
   * 글자 종류는 반드시 `staticText`를 준다. binding이 없는 글자 노드는 빈 칸으로
   * 만들어져서 사용자가 무엇을 채워야 하는지 알 수 없다.
   */
  createDefaultBinding: () => StudioBinding | undefined;
  /** 이미지 종류의 기본 맞춤. 이미지가 아니면 없다. */
  defaultFit?: StudioImageFit;
}

/** 글자 노드의 기본 표현. 캔버스 배경과 무관하게 보이도록 색을 명시한다. */
const STUDIO_TEXT_BASE_STYLE = {
  position: "absolute",
  color: "#111827",
  fontSize: 64,
  fontWeight: 700,
  textAlign: "left",
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
} as const satisfies StudioStyleRecord;

/**
 * 노드 종류 정의표.
 *
 * `satisfies Record<StudioGraphNodeType, ...>`이므로 union에 종류를 더하면 여기서
 * 컴파일이 깨진다. 종류별 기본값이 화면 여러 곳에 흩어져 있으면 추가 메뉴와
 * 인스펙터가 서로 다른 기본값을 쓰게 된다.
 */
const STUDIO_NODE_DEFINITIONS = {
  group: {
    type: "group",
    label: "Group",
    addMenuLabel: "Group",
    iconKey: "group",
    defaultSize: { width: 600, height: 400 },
    allowsChildren: true,
    inspectorSections: ["transform", "layout", "appearance", "group"],
    createDefaultStyle: () => ({
      position: "absolute",
      width: 600,
      height: 400,
      backgroundColor: "transparent",
      overflow: "visible",
    }),
    createDefaultBinding: () => undefined,
  },
  text: {
    type: "text",
    label: "Text",
    addMenuLabel: "Text",
    iconKey: "text",
    defaultSize: { width: 480, height: 100 },
    allowsChildren: false,
    inspectorSections: ["transform", "layout", "appearance", "text", "binding"],
    createDefaultStyle: () => ({
      ...STUDIO_TEXT_BASE_STYLE,
      width: 480,
      height: 100,
    }),
    createDefaultBinding: () => ({ kind: "staticText", value: "New text" }),
  },
  flexibleText: {
    type: "flexibleText",
    label: "Auto Text",
    addMenuLabel: "Auto-fit Text",
    iconKey: "autoText",
    defaultSize: { width: 480, height: 140 },
    allowsChildren: false,
    inspectorSections: ["transform", "layout", "appearance", "text", "binding"],
    createDefaultStyle: () => ({
      ...STUDIO_TEXT_BASE_STYLE,
      width: 480,
      height: 140,
    }),
    createDefaultBinding: () => ({ kind: "staticText", value: "New text" }),
  },
  image: {
    type: "image",
    label: "Image",
    addMenuLabel: "Image",
    iconKey: "image",
    defaultSize: { width: 400, height: 300 },
    allowsChildren: false,
    inspectorSections: [
      "transform",
      "layout",
      "appearance",
      "image",
      "binding",
    ],
    createDefaultStyle: () => ({
      position: "absolute",
      width: 400,
      height: 300,
      backgroundColor: "transparent",
      overflow: "hidden",
    }),
    createDefaultBinding: () => undefined,
    defaultFit: "cover",
  },
  shape: {
    type: "shape",
    label: "Rectangle",
    addMenuLabel: "Rectangle",
    iconKey: "shape",
    defaultSize: { width: 400, height: 200 },
    allowsChildren: false,
    inspectorSections: ["transform", "layout", "appearance", "shape"],
    createDefaultStyle: () => ({
      position: "absolute",
      width: 400,
      height: 200,
      backgroundColor: "#4f8cff",
      borderRadius: 0,
    }),
    createDefaultBinding: () => undefined,
  },
} satisfies Record<StudioGraphNodeType, StudioNodeDefinition>;

/**
 * 추가 메뉴에 보여줄 순서.
 *
 * 가장 자주 쓰는 글자를 먼저 두고 묶음을 마지막에 둔다. 화면마다 따로 배열을
 * 적으면 두 편집기의 메뉴 순서가 갈라진다.
 */
export const STUDIO_NODE_TYPE_ORDER = [
  "text",
  "flexibleText",
  "image",
  "shape",
  "group",
] as const satisfies readonly StudioGraphNodeType[];

export const getStudioNodeDefinition = (
  type: StudioGraphNodeType,
): StudioNodeDefinition => STUDIO_NODE_DEFINITIONS[type];

/** 정의표에 등록된 모든 종류. 추가 메뉴 순서대로 준다. */
export const getStudioNodeDefinitions = (): StudioNodeDefinition[] =>
  STUDIO_NODE_TYPE_ORDER.map(getStudioNodeDefinition);

/** 정의표에 실제로 들어 있는 종류. 가드가 union과 견주어 본다. */
export const getStudioNodeDefinitionTypes = (): StudioGraphNodeType[] =>
  Object.keys(STUDIO_NODE_DEFINITIONS) as StudioGraphNodeType[];

/** 자식을 가질 수 있는 종류인지. group만 참이다. */
export const canStudioNodeTypeHaveChildren = (
  type: StudioGraphNodeType,
): boolean => getStudioNodeDefinition(type).allowsChildren;

/** 글자를 그리는 종류인지. `text`와 `flexibleText`가 참이다. */
export const isStudioTextNodeType = (type: StudioGraphNodeType): boolean =>
  getStudioNodeDefinition(type).inspectorSections.includes("text");

/** 이 종류의 인스펙터에 이 섹션을 보여줄지. */
export const hasStudioNodeInspectorSection = (
  type: StudioGraphNodeType,
  section: StudioNodeInspectorSection,
): boolean => getStudioNodeDefinition(type).inspectorSections.includes(section);
