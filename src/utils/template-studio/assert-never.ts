/**
 * union을 빠짐없이 다뤘는지 컴파일 단계에서 확인한다.
 *
 * 모든 경우를 처리했다면 남은 값의 타입은 `never`다. union에 값이 늘었는데 분기를
 * 더하지 않으면 여기에 넘기는 값이 `never`가 아니게 되어 컴파일이 깨진다.
 *
 * 화면을 그리는 곳에서는 쓰지 않는다. 잘못된 문서 하나가 편집기 전체를 흰 화면으로
 * 만든다. 그쪽은 `const unhandled: never = value` 형태로 컴파일만 잠그고 눈에 보이는
 * 대체 표현을 그린다.
 */
export const assertStudioNever = (value: never): never => {
  throw new Error(`Unhandled studio union value: ${String(value)}`);
};
