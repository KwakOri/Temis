// 정적 이미지 import(`import bg from "./bg.png"`)의 타입 선언.
//
// 원래는 `next-env.d.ts`가 불러오지만 그 파일은 Next가 만들어 주는 파일이라
// gitignore에 들어 있다. 새로 받은 체크아웃(CI)에서는 파일이 없어서 `tsc`가
// 모든 이미지 import를 찾을 수 없는 모듈로 보고 실패한다.
/// <reference types="next/image-types/global" />
