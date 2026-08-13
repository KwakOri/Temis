import type { StudioGraphNodeType } from "@/types/template-studio";
import { getStudioNodeDefinition } from "@/utils/template-studio/node-definitions";

/**
 * 그래프 노드 종류의 표시 이름.
 *
 * 이름 규칙은 노드 정의표가 갖는다. 예전에는 종류 문자열의 첫 글자를 대문자로
 * 바꿔 만들었는데, 그렇게 하면 정의표에 없는 종류도 그럴듯한 이름을 얻어서
 * 빠진 종류를 화면에서 알아볼 수 없었다.
 */
export const getStudioGraphNodeTypeLabel = (
  type: StudioGraphNodeType,
): string => getStudioNodeDefinition(type).label;

/** 추가 메뉴에 쓰는 이름. 무엇이 만들어지는지 풀어 쓴다. */
export const getStudioGraphNodeTypeAddMenuLabel = (
  type: StudioGraphNodeType,
): string => getStudioNodeDefinition(type).addMenuLabel;
