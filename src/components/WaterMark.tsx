interface WaterMarkProps {
  fontSize: number;
}

const WaterMark = ({ fontSize }: WaterMarkProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-center items-center text-[#2d2d2d]/5"
      style={{
        fontFamily: "Yangjin",
        fontSize,
        transform: "rotate(-24deg)",
      }}
    >
      <p>{"테스트 템플릿 입니다"}</p>
      <p>{"테스트 템플릿 입니다"}</p>
      <p>{"테스트 템플릿 입니다"}</p>
    </div>
  );
};

export default WaterMark;
