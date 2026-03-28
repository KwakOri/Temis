import { PropsWithChildren } from "react";
import SectionTitle from "../SectionTitle";

export interface KeyFeaturesItem {
  question: string[];
  title: string;
  description: string[];
}

interface KeyFeaturesProps {
  items: KeyFeaturesItem[];
}

const ImageNames = ["money", "phone", "calendar"];

const KeyFeaturesSection = ({ items }: PropsWithChildren<KeyFeaturesProps>) => {
  return (
    <section className="w-full flex flex-col items-center gap-6 py-8 md:py-12 bg-[#221D19] px-4">
      <SectionTitle label="KEY FEATURES" intent={"white"} />

      <div className="flex flex-col items-center text-center px-4">
        <p
          style={{ lineHeight: 1.2 }}
          className="text-xl md:text-2xl lg:text-4xl text-[#F3E9E7]"
        >
          버튜버로{" "}
          <span className="text-[#FB712B] font-bold">
            직접 방송하며 느낀 불편함
          </span>
          들
        </p>
        <p
          style={{ lineHeight: 1.2 }}
          className="text-xl md:text-2xl lg:text-4xl text-[#F3E9E7]"
        >
          그걸 해결하기 위해 테미스를 만들었어요.
        </p>
      </div>
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-6xl">
        {items.map((item, i) => {
          return (
            <div key={i} className="flex-1 min-w-0">
              <div className="w-full max-w-[348px] mx-auto">
                <div
                  className="relative rounded-3xl pt-4 pb-6 shadow-lg border-2 my-5 mb-10"
                  style={{
                    backgroundColor: "#47413C",
                    borderColor: "#615851",
                  }}
                >
                  {/* Icon placeholder */}
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-xs md:text-sm text-[#FF9C69] bg-[#FC712B]/40 border border-[#FF8F57]/50 rounded-full px-4 md:px-5 py-1">
                      페인포인트 {i + 1}
                    </p>
                    <div className="flex-1 flex flex-col items-center px-2">
                      {item.question.map((line, i) => (
                        <p
                          key={"question line " + i}
                          style={{ lineHeight: 1.2 }}
                          className="text-white text-base md:text-lg lg:text-xl font-medium"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Triangle at bottom */}
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-4 w-0 h-0 border-l-[16px] border-r-[16px] border-t-[16px] border-l-transparent border-r-transparent"
                    style={{ borderTopColor: "#615851" }}
                  />
                  <div
                    className="absolute left-1/2 -translate-x-1/2 -bottom-[14px] w-0 h-0 border-l-[14px] border-r-[14px] border-t-[14px] border-l-transparent border-r-transparent"
                    style={{ borderTopColor: "#47413C" }}
                  />
                </div>
              </div>

              {/* Orange Gradient Card */}
              <div
                className="w-full max-w-[340px] mx-auto flex flex-col items-center rounded-3xl py-8 md:py-12 shadow-xl border border-[#FFAF52]"
                style={{
                  background: "linear-gradient(to bottom, #FD9319, #FC712B)",
                }}
              >
                {/* Icon placeholder */}
                <img
                  src={`/landing/${ImageNames[i]}.png`}
                  className="w-40 h-40 md:w-52 md:h-52 lg:w-60 lg:h-60 rounded-2xl mb-4 md:mb-6"
                  alt={item.title}
                />

                <h4 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 px-4 text-center">
                  {item.title}
                </h4>
                <div className="px-4 text-center">
                  {item.description.map((line, i) => (
                    <p
                      key={"description line " + i}
                      className="text-lg md:text-xl lg:text-2xl text-[#733412] leading-tight"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default KeyFeaturesSection;
