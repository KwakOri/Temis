"use client";
import TestComponent from "@/app/(root)/_sample/TestComponent";
import { useAuth } from "@/contexts/AuthContext"; // useAuth 임포트
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PortfolioGallery from "../../components/LandingPage/PortfolioGallery";
import StepSection from "../../components/LandingPage/StepSection";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user, loading, logout } = useAuth(); // user, loading, logout 상태 가져오기

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 1080);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".mobile-menu-container")) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAuthAction = async () => {
    if (user) {
      await logout();
    }
    // 로그인이 필요한 경우는 링크로 처리
  };

  // 로딩 스피너 컴포넌트
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
    </div>
  );
  return (
    <div className="w-full min-h-screen bg-gray-100 text-gray-900">
      {/* 상단 고정 바 */}
      <header
        className={`fixed top-0 left-0 w-full z-50 transition-colors duration-100 ${
          scrolled
            ? "bg-white/30 border-b-2 border-gray-200 backdrop-blur-sm "
            : "bg-white/30 border-white/20 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className={`text-2xl font-bold transition-colors duration-300 ${
              scrolled ? "text-gray-900" : "text-white"
            }`}
          >
            TEMIS
          </div>
          {/* 데스크탑 버전 - md 이상에서 표시 */}
          <div className="hidden md:flex gap-2">
            <Link href="/shop">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                템플릿 상점
              </p>
            </Link>

            <Link href="/custom-order">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                맞춤형 시간표 제작
              </p>
            </Link>

            <Link href="/my-page">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                마이페이지
              </p>
            </Link>

            {loading ? (
              <div className="bg-gray-200 text-gray-500 font-medium px-4 py-2 rounded-lg cursor-not-allowed min-w-[80px] h-[40px] flex items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : user ? (
              <button
                onClick={handleAuthAction}
                className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition min-w-[80px] h-[40px] flex items-center justify-center"
              >
                로그아웃
              </button>
            ) : (
              <Link href="/auth">
                <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition min-w-[80px] h-[40px] flex items-center justify-center">
                  로그인
                </p>
              </Link>
            )}
          </div>

          {/* 모바일 버전 - md 미만에서 표시 */}
          <div className="md:hidden mobile-menu-container relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-colors ${
                scrolled ? "hover:bg-gray-200" : "hover:bg-white/20"
              }`}
              aria-label="메뉴 열기"
            >
              <svg
                className={`w-6 h-6 transition-colors ${
                  scrolled ? "text-gray-900" : "text-white"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* 드롭다운 메뉴 */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                <Link
                  href="/shop"
                  className="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5H21"
                      />
                    </svg>
                    <span className="font-medium">템플릿 상점</span>
                  </div>
                </Link>

                <Link
                  href="/custom-order"
                  className="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-medium">맞춤형 시간표 제작</span>
                  </div>
                </Link>
                <Link
                  href="/my-page"
                  className="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-medium">마이페이지</span>
                  </div>
                </Link>

                {loading ? (
                  <div className="block px-4 py-3 text-gray-500 cursor-not-allowed">
                    <div className="flex items-center">
                      <div className="w-5 h-5 mr-3 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                      </div>
                      <span className="font-medium">확인 중...</span>
                    </div>
                  </div>
                ) : user ? (
                  <button
                    onClick={handleAuthAction}
                    className="block w-full px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-3 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      <span className="font-medium">로그아웃</span>
                    </div>
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="block px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 mr-3 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      <span className="font-medium">로그인</span>
                    </div>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <section className="relative h-screen w-full overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center items-center h-full text-white text-center px-4 bg-gradient-to-t from-[#1d2c52] to-[#0b0a13]">
          <h2 className="mt-30 text-3xl sm:text-4xl font-bold text-white mb-4 leading-relaxed">
            <span className="text-indigo-500 ml-2">버튜버</span> 가 만든,
            버튜버를 위한 <span className="text-indigo-500 ml-2">시간표</span>{" "}
            플랫폼
          </h2>
          <p className="text-white text-sm sm:text-base">
            복잡한 포토샵은 그만! 활동에 최적화된 직관적인 편집,
          </p>
          <p className="text-white text-sm sm:text-base">
            직접 활동하며 필요했던 기능만 쏙쏙 담았어요.
          </p>
          {/* <p className="mt-5  text-indigo-500 text-sm ">바로 체험 하기</p> */}
          <button
            onClick={scrollToBottom}
            className="mt-10 w-12 h-12 rounded-full bg-white flex items-center justify-center animate-bounce"
          >
            <span className="text-2xl text-gray-800">↓</span>
          </button>
        </div>
      </section>
      <TestComponent />

      {/* Portfolio Gallery Section */}
      <PortfolioGallery totalItems={9} speedPxPerSecond={50} />

      <section className="py-20 bg-[#2b303d] text-white px-4 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2">
          방송을 하며 직접 느낀
          <span className="text-indigo-400 ml-2">불편한 시간표</span>를 싹~
          개선했습니다.
        </h2>
        <p className="text-sm mb-10 opacity-80">
          진짜 버튜버가 버튜버를 위해 만든 TEMIS!
        </p>

        {/* 카드 래퍼 */}
        <div className="flex justify-center flex-wrap gap-6 w-full max-w-6xl mx-auto">
          {[
            {
              text: "폰트도 다운로드, \n 포토샵이 없다면 구매까지...",
              emoji: "/img/landing_page/9.png",
            },
            {
              text: "포토샵에 익숙하지 않아서 \n 디자인이 살짝 달라졌내...",
              emoji: "./img/landing_page/12.png",
            },
            {
              text: "컴퓨터 사양이 안 좋아서 \n 저장하다가 날라갔어...",
              emoji: "./img/landing_page/11.png",
            },
            {
              text: "지금 밖인데... 시간표 \n 수정해야해 어쩌지",
              emoji: "./img/landing_page/10.png",
            },
          ].map((item, idx) => (
            <div key={idx} className="flex-shrink-0 w-[250px] text-center">
              <div className="rounded-[24px] px-4 py-3 mb-4 text-sm whitespace-pre-line bg-white/10 text-white backdrop-blur-md shadow-[inset_0_0_10px_rgba(255,255,255,0.1),_0_0_20px_rgba(0,0,0,0.3)] border border-white/10">
                {item.text}
              </div>
              <Image
                src={item.emoji.replace("./", "/")}
                alt="emoji"
                className="w-auto h-auto mx-auto mb-2 mask-fade-bottom"
                width={300}
                height={300}
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
              />
            </div>
          ))}
        </div>
      </section>

      {/* 사용 방법 섹션 */}
      <StepSection />

      {/* CTA 섹션 */}
      <section ref={bottomRef} className="py-20 bg-gray-50 text-center">
        <h2 className="text-2xl font-bold mb-8">
          TEMIS로 편리한 Vtuber 생활 시작해 볼까요?
        </h2>
        {/* <Link
          href="/sample"
          className="inline-block bg-[#3E4A82] text-white px-8 py-4 rounded-xl text-lg hover:bg-[#2a304b] transition"
        >
          30일 무료 체험 하러가기
        </Link> */}
      </section>
    </div>
  );
}
