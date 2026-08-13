export interface StudioSharedValue<TValue> {
  /** 값이 갈릴 때 칸에 보여줄 대표 값. 첫 번째 것을 쓴다. */
  value: TValue;
  /** 고른 것들의 값이 서로 다른지. 그러면 칸을 비우고 갈렸다고 알린다. */
  mixed: boolean;
}

/**
 * 여러 개를 골랐을 때 칸에 무엇을 보여줄지 정한다.
 *
 * 값이 갈렸는데 첫 번째 값을 그냥 보여주면, 사용자는 고른 것 전부가 그 값이라고 읽는다.
 * 그러면 바꾸지 않은 칸의 값이 손대지 않은 노드에도 적용된 것처럼 보인다.
 *
 * 갈렸다는 표시만 하고 값 자체는 바꾸지 않는다. 실제로 적용하는 것은 사용자가 적어 넣은
 * 칸뿐이다.
 */
export const getStudioSharedValue = <TValue>(
  values: readonly TValue[],
  fallback: TValue,
): StudioSharedValue<TValue> => {
  if (values.length === 0) return { value: fallback, mixed: false };

  const [first] = values;
  return {
    value: first,
    mixed: values.some((candidate) => candidate !== first),
  };
};

/** 숫자 칸용. 숫자가 아닌 값은 기본값으로 본다. */
export const getStudioSharedNumberValue = (
  values: readonly unknown[],
  fallback = 0,
): StudioSharedValue<number> =>
  getStudioSharedValue(
    values.map((value) =>
      typeof value === "number" && Number.isFinite(value) ? value : fallback,
    ),
    fallback,
  );

/** 글자 칸용. 값이 없으면 기본값으로 본다. */
export const getStudioSharedStringValue = (
  values: readonly unknown[],
  fallback = "",
): StudioSharedValue<string> =>
  getStudioSharedValue(
    values.map((value) => (typeof value === "string" ? value : fallback)),
    fallback,
  );
