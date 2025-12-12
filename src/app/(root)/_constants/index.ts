import { KeyFeaturesItem } from "@/components/LandingPage/KeyFeatures/KeyFeatures";
import { Review } from "@/components/LandingPage/ReviewSection/ReviewSection";
import { SegmentedControlItem } from "@/components/UI/SegmentedControl/SegmentedControl";

export const mainCategories: SegmentedControlItem[] = [
  { label: "SHOP", href: "/#", type: "link" },
  { label: "PORTFOLIO", href: "/#", type: "link" },
  { label: "PROGRESS", href: "/#", type: "link" },
];
export const authLinks: SegmentedControlItem[] = [
  { label: "SIGN IN", href: "/#", type: "link" },
  { label: "SIGN UP", href: "/#", type: "link", intent: "secondary" },
];
export const keyFeatureList: KeyFeaturesItem[] = [
  {
    question: ["해마다 비싸지는 포토샵,", "비전문가에게는 편집이 어려워요"],
    title: "한 번의 구매로 평생 사용!",
    description: ["직관적인 디자인으로", "비전문가도 쉽게 편집 가능!"],
  },
  {
    question: [
      "컴퓨토에서만 작업해야 하는 일정표,",
      "스마트폰에서도 편하게 작업하고 싶어요",
    ],
    title: "언제 어디서나 편하게!",
    description: ["컴퓨터에서도, 모바일에서도", "간편하게 일정표 제작 가능!"],
  },
  {
    question: [
      "매달 팀원 일정을 취합하고 정리해서",
      "직접 작성하는 일이 너무 번거로워요",
    ],
    title: "개인 시간표 저장하면 자동으로!",
    description: ["여러명의 팀원들 일정을", "자동으로 정리해줄게요!"],
  },
];
export const reviews: Review[] = [
  {
    title:
      "이제 포토샵 켜서 하나하나 월요일...화요일...이러고 레이어 안 찾아도 되어서 너무 편해ㅠㅠ",
    description:
      "새 스케쥴표가 나왔어!\nTEMIS에서 제작해 주셨어!\n\n내가 가득가득 찬 디자인을 좋아해서\n가득 차 보이게 해주세요! 했는데\n\n완 벽 천 재\n\n바로바로 수정하는 것도 편하고\n컨셉에 맞게 예쁘게 잘 나온 것 같아!\n이제 포토샵 켜서 하나하나 월요일...화요일...\n이러고 레이어 안 찾아도 되어서 너무 편해ㅠㅠ\n\n스케쥴표가 필요하고 포토샵이 없거나\n편집하기 귀찮아하는 분들은 만들면 좋을 듯!",
    size: "lg",
  },
  {
    title:
      "TEMIS 시간표가 너무 편리해보여서 처음으로 주간 일정표를 만들어봤어요ㅎ 모바일에서도 수정이 편리해서 좋더라구요!",
    description:
      "일정 변동도 잦고 포토샵 사용이 서툴러서 이때까지는 \n주간 일정표 없이 당일 공지하다가, TEMIS 시간표가\n너무 편리해보여서 처음으로 주간 일정표를 만들어봤어요ㅎ\n모바일에서도 수정이 편리해서 좋더라구요!\n맞춤형 스케줄러 오마카세 신청했더니 너무 예쁘게\n디자인해주셨어요. 감사합니다!!",
    size: "sm",
  },
  {
    title:
      "아직 이 사이트를 모르는 스머분들이 있다면 다들 빨리 알려주세요... 진짜 한번 사용하시면 그 뒤로는 못 돌아갑니다...",
    description:
      "(샘플디자인)같은 꾸밈 요소가 있었으면 좋겠습니다!!\n설정이 우주라서 SF 같은 느낌*(차가운/심플한)이 많은데\n그것도 좋지만 조금 더 꾸밈 요소가 있어서 화면이\n좀 찼으면 좋겠습니다!!\n이렇게 오마카세 신청했는데\n이렇게 나왔다구요? 이런데 왜않해?",
    size: "sm",
  },
  {
    title:
      "기술면, 편리성면에서는 PC가 아니라 모바일로도 된다는게 진짜 대박이라니까...",
    description:
      "요청 했던 제 작전 계획표가 완성 되었습니다\n일단 스타일면에서 내가 맨처음에 레퍼런스 들고\n갔을때는 분명 그 레퍼런스가 이뻐보였는데\n곰곰히 생각해보니까 안이쁘더라고..(•_•\n그래서 싹다 엎고 그냥 알아서 해주세요! 하니까\n이게 나온게 있지...역시 디자인은 전문가가 해야해...\n\n그리고 기술면, 편리성면에서는 PC가 아니라\n모바일로도 된다는게 진짜 대박이라니까...\n나 같은 기계치는 포토샵도 못하는데 얘는\n그냥 정해진 빈칸에 적으먄 알아서 스케줄로\n들어가는게...진짜 떼끄놀로지아\n\n솔직히 나 결과물 나오기 전부터 주변에다가\n하실 하실 하고 영업 했다는건 안비밀이야",
    size: "lg",
  },
  {
    title:
      "자동으로 단체 스케쥴표에도 입력되어서 팀이나 크루 활동하시는 분들에게 엄청 좋을 것 같아요!",
    description:
      "기존에는 클튜로 하나하나 간격 맞춰주고 해야 했는데\n이제는 글자만 적으면 되니 너무 편해요\n연동도 가능해서 저의 일정을 저장하기만 하면\n자동으로 단체 스케쥴표에도 입력되어서 팀이나\n크루 활동하시는 분들에게 엄청 좋을 것 같아요!\n스케쥴표 필요하신 분들 편집하기 귀찮으신 분들 완전 추천드려요",
    size: "sm",
  },

  {
    title: "TEMIS는 모바일 환경에도 대응이 잘 되어있더라구요 ...",
    description:
      "평소 같으면 잠이가 오더라도 주섬주섬\n컴터 앞에서 포토샵켜서 맹글던 시간표..\n\n시간표 올리는 걸 깜빡했는데 포토샵을 쓸 수 없을 땐\n냅다 그냥 텍스트로만이라도 올리곤 했었는데\nTEMIS는 모바일 환경에도 대응이 잘 되어있더라구요\n\n침대에서 이번주 모하디~ 뒹굴거리면서\n일정을 고민할 수 있고 심지어 루희는 맞춤형시간표를\n제작해서 슈퍼간즤나는 결과물이 나온단 사실\n\n제공되는 기본 템풀릿도 귀염뽀짝하고 색도 다양하지만\n나의 RP나 이미지에 찰떡인 맞춤형 시간표 제작?\n무조건 왕추천드립니다\n\n모두 TEMIS하는 그 날까지\n널리널리 알리고 다녀야 겠오요 ㅎㅎ",
    size: "lg",
  },
];
