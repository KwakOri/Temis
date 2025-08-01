import Image from "next/image";
import { useEffect, useState } from "react";

const StepSection = () => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 3);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      step: "STEP 1",
      text: "휴방일, 방송시간, \n방송 제목, 소제목 작성하기",
      img: "./img/landing_page/20.gif",
    },
    {
      step: "STEP 2",
      text: "우측 하단에 위치한 이미지 입력 버튼\n 눌러 이미지 삽입하기",
      img: "./img/landing_page/21.gif",
    },
    {
      step: "STEP 3",
      text: "이미지로 저장버튼을 누르면\n잠시 후 자동으로 다운로드 완료",
      img: "./img/landing_page/22.gif",
    },
  ];

  return (
    <section className="py-20 bg-white  px-4 text-center">
      <h2 className="text-2xl font-bold mb-12">TEMIS 어떻게 사용해요?</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {steps.map(({ step, text, img }, idx) => {
          const isActive = currentStep === idx;
          const colorClass = isActive
            ? "bg-[#3E4A82] text-white"
            : "bg-gray-400 text-white";

          return (
            <div
              key={idx}
              className={`flex flex-col items-center text-center max-w-sm mx-auto transition-transform duration-700 ${
                isActive ? "scale-105 opacity-100" : "scale-95 opacity-50"
              }`}
            >
              <div className="w-full flex flex-col items-center">
                <div
                  className={`mb-2 px-4 py-1 rounded-full text-sm font-semibold shadow ${colorClass}`}
                >
                  {step}
                </div>
                <p className="text-base leading-relaxed whitespace-pre-line text-center text-gray-700">
                  {text}
                </p>
                <Image
                  src={img.replace("./", "/")}
                  alt={step}
                  className="mt-4 rounded-xl shadow w-full"
                  width={300}
                  height={200}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  unoptimized
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StepSection;
