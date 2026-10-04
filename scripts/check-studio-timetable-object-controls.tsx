import { createTimetableNodeFixture } from "./helpers/studio-timetable-fixture";
import { createTimetableGraphFixture } from "./helpers/studio-timetable-fixture";
import type { StudioTimetableGraphRecipe } from "../src/utils/template-studio/timetable-graph-commands";
import type { StudioTimetableGraphNode } from "../src/types/studio-timetable-graph";
import { normalizeStudioTimetableDateBinding } from "../src/utils/template-studio/timetable-bindings";
import { StudioTextTypographyControls } from "../src/components/studio/inspector/studio-text-typography-controls";
/**
 * 시간표 객체 인스펙터 컨트롤의 기준선 가드.
 *
 * 마스크는 문서에 모양 대신 반지름만 남고, 정렬은 justifyContent와 함께 가야
 * 하고, 날짜 틀을 직접 고치면 형식이 custom으로 바뀐다. 이 규칙이 깨지면 화면과
 * 결과가 어긋난다.
 */
import assert from "node:assert/strict";
// jsx: "preserve" 환경이라 클래식 변환용 React 심볼이 스코프에 있어야 한다.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  StudioTimetableArtistProfileTextAssetLayoutControls,
  StudioTimetableObjectVariantControls,
  StudioTimetableProfileMaskControls,
  StudioTimetableTextTypographyControls,
  StudioTimetableWeekDatesFormatControls,
} from "../src/app/(root)/template-studio/_components/studio-timetable-object-inspector-controls";
import {
  StudioTimetableOpacityField,
  StudioTimetableVisibilityField,
} from "../src/app/(root)/template-studio/_components/studio-timetable-object-controls";
import type {
  StudioTemplateDocument,
  StudioTimetableCompositionObject,
} from "../src/types/template-studio";
import { STUDIO_WEEK_DATE_FORMAT_PRESETS } from "../src/utils/template-studio/date-template";
import {
  getStudioMaskRadiusFromShape,
  getStudioMaskShapeFromRadius,
  getStudioWeekDatePresetValue,
  getStudioWeekDateTemplateValue,
} from "../src/utils/template-studio/timetable-object-style";

import {
  createSampleStudioDocument,
  createInitialStudioRuntimeValues,
} from "../src/utils/template-studio/sample-document";
import { StudioTimetablePreview } from "../src/app/(root)/template-studio/_components/studio-timetable-preview";

const nativeControlProps = (object: StudioTimetableCompositionObject) => {
  const fixture = createTimetableNodeFixture(object);
  return {
    object: fixture.node,
    style: fixture.style,
    extension: fixture.extension,
  };
};

const noop = () => {};

const createObject = (
  overrides: Partial<StudioTimetableCompositionObject> = {},
): StudioTimetableCompositionObject =>
  ({
    id: "object",
    kind: "text",
    label: "Object",
    style: {},
    ...overrides,
  }) as StudioTimetableCompositionObject;

const createDocument = (): StudioTemplateDocument =>
  ({
    schema: "studio_template_document",
    version: 3,
    metadata: { editor: "template-studio", kind: "timetable", name: "t" },
    canvas: { width: 100, height: 100, background: "#fff" },
    graph: { rootNodeIds: [], nodes: {} },
    inputs: {},
    styles: {},
    assets: {},
  }) as unknown as StudioTemplateDocument;

const applyGraphRecipe = (
  object: StudioTimetableCompositionObject,
  recipe: StudioTimetableGraphRecipe,
) => {
  normalizeStudioTimetableDateBinding(object);
  const node: StudioTimetableGraphNode = {
    id: object.id,
    type:
      object.kind === "generatedDayCards"
        ? "group"
        : (object.kind as StudioTimetableGraphNode["type"]),
    label: object.label,
    parentId: object.parentId ?? null,
    childIds: object.childIds ?? [],
    layoutMode: object.layoutMode,
    binding: object.binding,
    variantSet: object.variantSet,
  };
  const extension = { inlineAssetLayout: {} };
  recipe({ node, style: object.style, extension });
  object.binding = node.binding;
  object.variantSet = node.variantSet;
  const layout = extension.inlineAssetLayout as {
    mode?: string;
    position?: string;
    size?: number;
    gap?: number;
  };
  for (const [key, value] of Object.entries({
    assetMode: layout.mode,
    assetPosition: layout.position,
    assetSize: layout.size,
    assetGap: layout.gap,
  }))
    if (value !== undefined) object.style[key] = value;
};

/** 컨트롤이 넘긴 recipe를 객체에 적용하고 결과를 준다. */
const applyRecipes = (
  object: StudioTimetableCompositionObject,
  run: (onUpdateObject: (recipe: StudioTimetableGraphRecipe) => void) => void,
): StudioTimetableCompositionObject => {
  run((recipe) => applyGraphRecipe(object, recipe));
  return object;
};

/** 만들어진 요소 나무에서 조건에 맞는 요소를 모은다. */
const findAll = (
  node: React.ReactNode,
  match: (props: Record<string, unknown>) => boolean,
  elementType?: string,
): Array<React.ReactElement<Record<string, never>>> => {
  const found: Array<React.ReactElement<Record<string, never>>> = [];

  const visit = (current: React.ReactNode) => {
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (!React.isValidElement(current)) return;

    if (current.type === StudioTextTypographyControls) {
      visit(
        StudioTextTypographyControls(
          current.props as React.ComponentProps<
            typeof StudioTextTypographyControls
          >,
        ),
      );
      return;
    }
    const props = current.props as Record<string, unknown>;
    if ((!elementType || current.type === elementType) && match(props)) {
      found.push(current as React.ReactElement<Record<string, never>>);
    }
    visit(props.children as React.ReactNode);
  };

  visit(node);
  return found;
};

// --- 보임 토글 ---
//
// 문서는 숨김을 저장하고 화면은 보임으로 묻는다. 이 뒤집힘이 풀리면 목록의
// 체크가 실제와 반대로 보인다.

assert.ok(
  renderToStaticMarkup(
    <StudioTimetableVisibilityField hidden={false} onChange={noop} />,
  ).includes('checked=""'),
  "숨기지 않은 객체는 보임으로 켜져 있다.",
);
assert.ok(
  !renderToStaticMarkup(
    <StudioTimetableVisibilityField hidden onChange={noop} />,
  ).includes('checked=""'),
  "숨긴 객체는 보임이 꺼져 있다.",
);

const visibilityCalls: boolean[] = [];
const visibilityCheckbox = findAll(
  StudioTimetableVisibilityField({
    hidden: true,
    onChange: (visible) => visibilityCalls.push(visible),
  }),
  (props) => props.type === "checkbox",
  "input",
)[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;

visibilityCheckbox.props.onChange({ currentTarget: { checked: true } });
assert.deepEqual(visibilityCalls, [true], "체크를 켜면 보임으로 알린다.");

// --- 투명도 ---

assert.ok(
  renderToStaticMarkup(
    <StudioTimetableOpacityField opacity={0.4} onChange={noop} />,
  ).includes('value="40"'),
  "문서의 0~1 값을 백분율로 보여준다.",
);

const opacityCalls: number[] = [];
const opacityField = StudioTimetableOpacityField({
  opacity: 1,
  onChange: (opacity) => opacityCalls.push(opacity),
}) as React.ReactElement<{ onChange: (value: number) => void }>;

opacityField.props.onChange(40);
opacityField.props.onChange(140);
opacityField.props.onChange(-20);
assert.deepEqual(
  opacityCalls,
  [0.4, 1, 0],
  "백분율을 0~1로 되돌리고 범위를 벗어난 값은 자른다.",
);

// --- 마스크 ---
//
// 문서에는 모양 대신 반지름만 남는다. 그래서 두 방향 변환이 서로 맞아야 한다.

assert.equal(getStudioMaskShapeFromRadius(0), "rectangle");
assert.equal(getStudioMaskShapeFromRadius(24), "rounded");
assert.equal(getStudioMaskShapeFromRadius(9999), "circle");
assert.equal(
  getStudioMaskShapeFromRadius(-5),
  "rectangle",
  "음수 반지름도 모서리 없는 것으로 본다.",
);

assert.equal(getStudioMaskRadiusFromShape("rectangle"), 0);
assert.equal(getStudioMaskRadiusFromShape("circle"), 9999);
assert.equal(
  getStudioMaskShapeFromRadius(getStudioMaskRadiusFromShape("rounded")),
  "rounded",
  "모양으로 정한 반지름을 다시 읽으면 같은 모양이 나와야 한다.",
);

const maskMarkup = renderToStaticMarkup(
  <StudioTimetableProfileMaskControls
    {...nativeControlProps(
      createObject({ style: { borderRadius: 9999 } } as never),
    )}
    onUpdateObject={noop}
  />,
);
assert.ok(
  maskMarkup.includes('value="circle" selected=""'),
  "반지름으로 지금 모양을 읽어 보여준다.",
);
assert.ok(maskMarkup.includes('value="9999"'), "반지름 값도 함께 보여준다.");

const maskObject = createObject({ style: {} } as never);
applyRecipes(maskObject, (onUpdateObject) => {
  const element = StudioTimetableProfileMaskControls({
    ...nativeControlProps(maskObject),
    onUpdateObject,
  }) as React.ReactElement<{ children: React.ReactElement[] }>;
  const select = findAll(
    element,
    () => true,
    "select",
  )[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;
  select.props.onChange({ currentTarget: { value: "circle" } });
});
assert.equal(
  maskObject.style.borderRadius,
  9999,
  "원을 고르면 원으로 볼 반지름을 쓴다.",
);

const getDateBinding = (object: StudioTimetableCompositionObject) => {
  if (object.binding?.kind !== "builtinField")
    throw new Error("expected a date binding");
  return object.binding;
};

// --- 글꼴 ---

const typographyMarkup = renderToStaticMarkup(
  <StudioTimetableTextTypographyControls
    document={createDocument()}
    fontFamilies={["Inter", "Pretendard"]}
    {...nativeControlProps(createObject({ style: { fontSize: 24 } } as never))}
    onUpdateObject={noop}
  />,
);
assert.ok(typographyMarkup.includes("Pretendard"), "폰트 후보를 받아서 쓴다.");
assert.ok(typographyMarkup.includes('value="24"'), "글자 크기를 보여준다.");
assert.ok(
  typographyMarkup.includes("<span>Line Height</span>"),
  "줄 높이를 편집한다.",
);
assert.ok(
  !typographyMarkup.includes("Line Breaks"),
  "고정 크기 텍스트에는 줄바꿈 선택이 없다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioTimetableTextTypographyControls
      document={createDocument()}
      fontFamilies={["Inter"]}
      {...nativeControlProps(createObject({ kind: "flexibleText" } as never))}
      onUpdateObject={noop}
    />,
  ).includes("Line Breaks"),
  "Auto Text에는 줄바꿈 선택이 나타난다.",
);

// 정렬은 justifyContent와 함께 가야 한다.
const alignObject = createObject({ kind: "text" } as never);
applyRecipes(alignObject, (onUpdateObject) => {
  const element = StudioTimetableTextTypographyControls({
    document: createDocument(),
    fontFamilies: ["Inter"],
    ...nativeControlProps(alignObject),
    onUpdateObject,
  });
  const alignField = findAll(element, (props) =>
    Boolean(props.value === "left" && props.onChange),
  )[0] as unknown as React.ReactElement<{
    onChange: (value: string) => void;
  }>;
  alignField.props.onChange("center");
});
assert.equal(alignObject.style.textAlign, "center", "정렬을 저장한다.");
assert.ok(
  alignObject.style.justifyContent,
  "정렬을 바꿀 때 justifyContent도 함께 맞춘다. 어긋나면 미리보기와 결과가 달라진다.",
);

// 텍스트가 아닌 객체는 style을 건드리지 않는다.
const groupObject = createObject({ kind: "group" } as never);
applyRecipes(groupObject, (onUpdateObject) => {
  const element = StudioTimetableTextTypographyControls({
    document: createDocument(),
    fontFamilies: ["Inter"],
    ...nativeControlProps(groupObject),
    onUpdateObject,
  }) as React.ReactElement<{ children: React.ReactElement[] }>;
  const select = findAll(
    element,
    () => true,
    "select",
  )[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;
  select.props.onChange({ currentTarget: { value: "Pretendard" } });
});
assert.deepEqual(
  groupObject.style,
  {},
  "텍스트가 아닌 객체에는 글꼴을 쓰지 않는다.",
);

// --- 주간 날짜 형식 ---

assert.equal(
  getStudioWeekDatePresetValue(createObject()),
  "long",
  "정하지 않으면 기본 형식으로 본다.",
);
assert.ok(
  getStudioWeekDateTemplateValue(createObject()).length > 0,
  "형식만 있어도 보여줄 틀이 있다.",
);
assert.equal(
  getStudioWeekDatePresetValue(
    createObject({
      style: { dateRangeTemplate: "made up template" },
    } as never),
  ),
  "custom",
  "프리셋과 다른 틀을 적었으면 custom으로 본다.",
);

// 프리셋을 고른 뒤 틀을 건드리지 않았는데 custom으로 보이면 혼란스럽다.
const shortPreset = STUDIO_WEEK_DATE_FORMAT_PRESETS.find(
  (preset) => preset.id === "short",
);
assert.ok(shortPreset, "표본으로 쓸 프리셋이 있다.");
assert.equal(
  getStudioWeekDatePresetValue(
    createObject({
      style: {
        dateRangeTemplate: shortPreset.template,
        dateRangeFormat: "custom",
      },
    } as never),
  ),
  "short",
  "적은 틀이 프리셋과 같으면 그 프리셋으로 보여준다.",
);

const dateObject = createObject({
  presetId: "weekDates",
  binding: { kind: "builtinField", fieldId: "week.date_range" },
});
applyRecipes(dateObject, (onUpdateObject) => {
  const element = StudioTimetableWeekDatesFormatControls({
    ...nativeControlProps(dateObject),
    onUpdateObject,
  });
  const textarea = findAll(
    element,
    () => true,
    "textarea",
  )[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;
  textarea.props.onChange({ currentTarget: { value: "custom one" } });
});
assert.equal(
  getDateBinding(dateObject).dateRangeTemplate,
  "custom one",
  "직접 적은 틀을 저장한다.",
);
assert.equal(
  getDateBinding(dateObject).dateRangeFormat,
  "custom",
  "틀을 직접 고치면 형식도 custom으로 바꾼다. 안 바꾸면 프리셋이 틀을 덮어쓴다.",
);

assert.equal(
  dateObject.style.dateRangeTemplate,
  undefined,
  "포맷은 style 대신 binding에만 저장한다.",
);

// 프리셋을 고르면 그 프리셋의 틀을 함께 적어 둔다.
const presetObject = createObject({
  presetId: "weekDates",
  binding: { kind: "builtinField", fieldId: "week.date_range" },
  style: { dateRangeTemplate: "old", dateRangeFormat: "custom" },
} as never);
applyRecipes(presetObject, (onUpdateObject) => {
  const element = StudioTimetableWeekDatesFormatControls({
    ...nativeControlProps(presetObject),
    onUpdateObject,
  });
  const select = findAll(
    element,
    () => true,
    "select",
  )[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;
  select.props.onChange({ currentTarget: { value: "long" } });
});
assert.equal(getDateBinding(presetObject).dateRangeFormat, "long");
assert.notEqual(
  getDateBinding(presetObject).dateRangeTemplate,
  "old",
  "프리셋을 고르면 그 프리셋의 틀로 바꾼다.",
);

// 토큰 버튼은 이미 적은 틀 뒤에 붙인다.
const tokenObject = createObject({
  presetId: "weekDates",
  binding: { kind: "builtinField", fieldId: "week.date_range" },
  style: { dateRangeTemplate: "start" },
} as never);
applyRecipes(tokenObject, (onUpdateObject) => {
  const element = StudioTimetableWeekDatesFormatControls({
    ...nativeControlProps(tokenObject),
    onUpdateObject,
  });
  const tokenButton = findAll(
    element,
    (props) => props.type === "button",
    "button",
  )[0] as unknown as React.ReactElement<{ onClick: () => void }>;
  tokenButton.props.onClick();
});
assert.ok(
  getDateBinding(tokenObject)
    .dateRangeTemplate?.toString()
    .startsWith("start "),
  "이미 적은 틀을 지우지 않고 뒤에 붙인다.",
);

// --- 이미지 배치 ---

const layoutMarkup = renderToStaticMarkup(
  <StudioTimetableArtistProfileTextAssetLayoutControls
    {...nativeControlProps(
      createObject({ style: { assetMode: "hidden" } } as never),
    )}
    onUpdateObject={noop}
  />,
);
assert.ok(
  layoutMarkup.includes('disabled=""'),
  "이미지를 감추면 위치 선택도 잠근다.",
);
assert.ok(
  !renderToStaticMarkup(
    <StudioTimetableArtistProfileTextAssetLayoutControls
      {...nativeControlProps(createObject())}
      onUpdateObject={noop}
    />,
  ).includes('disabled=""'),
  "이미지가 보이면 위치를 고를 수 있다.",
);

const sizeObject = createObject();
applyRecipes(sizeObject, (onUpdateObject) => {
  const element = StudioTimetableArtistProfileTextAssetLayoutControls({
    ...nativeControlProps(sizeObject),
    onUpdateObject,
  });
  const sizeField = findAll(
    element,
    (props) => props.label === "Asset Size",
  )[0] as unknown as React.ReactElement<{ onChange: (value: number) => void }>;
  sizeField.props.onChange(1);
});
assert.equal(
  sizeObject.style.assetSize,
  24,
  "이미지 크기는 너무 작아지지 않게 막는다.",
);

// --- 상태 선택 ---

assert.equal(
  StudioTimetableObjectVariantControls({
    ...nativeControlProps(createObject()),
    onUpdateObject: noop,
    editingValue: "a",
    onSelectEditingValue: noop,
  }),
  null,
  "상태가 없는 객체에는 상태 선택이 나타나지 않는다.",
);

const variantObject = createObject({
  variantSet: {
    inputId: "input_1",
    defaultValue: "a",
    options: [
      { value: "a", label: "A" },
      { value: "b", label: "B" },
    ],
  },
} as never);

const variantMarkup = renderToStaticMarkup(
  <StudioTimetableObjectVariantControls
    {...nativeControlProps(variantObject)}
    editingValue="a"
    onSelectEditingValue={noop}
    onUpdateObject={noop}
  />,
);
assert.ok(
  variantMarkup.includes("Editing design state:"),
  "지금 편집 중인 상태를 알려준다.",
);
assert.ok(
  variantMarkup.includes("bg-[var(--accent)] text-white"),
  "고른 상태를 눌린 모습으로 보여준다.",
);
assert.ok(
  renderToStaticMarkup(
    <StudioTimetableObjectVariantControls
      {...nativeControlProps({
        ...variantObject,
        variantSet: { ...variantObject.variantSet, activeValue: "b" },
      } as StudioTimetableCompositionObject)}
      onUpdateObject={noop}
      editingValue="b"
      onSelectEditingValue={noop}
    />,
  ).includes(">B</span>"),
  "정해 둔 상태가 있으면 기본값 대신 그것을 보여준다.",
);

// 일반 날짜 요소는 포맷을 바인딩에 저장하며 실제 렌더링에도 적용한다.
for (const fieldId of [
  "week.start_date",
  "week.end_date",
  "week.date_range",
] as const) {
  const object = createObject({ binding: { kind: "builtinField", fieldId } });
  const element = StudioTimetableWeekDatesFormatControls({
    ...nativeControlProps(object),
    onUpdateObject: (recipe) => applyGraphRecipe(object, recipe),
  });
  const textarea = findAll(
    element,
    () => true,
    "textarea",
  )[0] as unknown as React.ReactElement<{ onChange: (event: unknown) => void }>;
  const template =
    fieldId === "week.date_range"
      ? "${start.YYYY}/${start.MM}/${start.DD} ~ ${end.MM}/${end.DD}"
      : "${YYYY}/${MM}/${DD}";
  textarea.props.onChange({ currentTarget: { value: template } });
  assert.equal(object.binding?.kind, "builtinField");
  if (object.binding?.kind !== "builtinField")
    throw new Error("Missing date binding");
  assert.equal(object.binding.dateRangeFormat, "custom");
  assert.equal(object.binding.dateRangeTemplate, template);
  assert.deepEqual(
    object.style,
    {},
    "일반 날짜 포맷은 스타일 값으로 중복 저장하지 않는다.",
  );
  const document = createSampleStudioDocument();
  const values = createInitialStudioRuntimeValues(document);
  values.timetable.weekStartDate = "2026-09-28";
  document.domains!.timetable!.composition = {
    rootObjectIds: [object.id],
    objects: { [object.id]: object },
  };
  const markup = renderToStaticMarkup(
    <StudioTimetablePreview
      document={createTimetableGraphFixture(document)}
      runtimeValues={values}
    />,
  );
  const expected =
    fieldId === "week.date_range"
      ? "2026/09/28 ~ 10/04"
      : fieldId === "week.start_date"
        ? "2026/09/28"
        : "2026/10/04";
  assert.ok(
    markup.includes(expected),
    `${fieldId} 포맷 변경이 실제 시간표 렌더링에 적용된다.`,
  );
  if (fieldId !== "week.date_range") {
    object.presetId = "weekDates";
    object.style.dateRangeTemplate = "legacy-range";
    const splitMarkup = renderToStaticMarkup(
      <StudioTimetablePreview
        document={createTimetableGraphFixture(document)}
        runtimeValues={values}
      />,
    );
    assert.ok(
      splitMarkup.includes(expected),
      "Week Dates의 단일 날짜 바인딩도 기간 전용 렌더를 우회한다.",
    );
  }
}

console.log("Studio timetable object control baseline checks passed.");
