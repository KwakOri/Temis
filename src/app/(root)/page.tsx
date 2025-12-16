"use client";
import GallerySection from "@/components/LandingPage/GallerySection/GallerySection";
import KeyFeaturesSection from "@/components/LandingPage/KeyFeatures/KeyFeatures";
import MainHeader from "@/components/LandingPage/MainHeader/MainHeader";
import ReviewSection from "@/components/LandingPage/ReviewSection/ReviewSection";
import { useAuth } from "@/contexts/AuthContext"; // useAuth 임포트
import { useAdminOptions } from "@/hooks/query/useAdminOptions";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { keyFeatureList, reviews } from "./_constants";
import TestComponent from "./_sample/TestComponent";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { user, loading, logout } = useAuth(); // user, loading, logout 상태 가져오기
  const router = useRouter();

  // 관리자 옵션 조회 (맞춤 시간표 접수 설정)
  const { data: adminOptions, isLoading: isLoadingAdminOptions } =
    useAdminOptions("general");

  // 맞춤 시간표 접수 활성화 여부
  const isCustomOrderEnabled = adminOptions?.some(
    (opt) => opt.value === "custom_timetable_orders" && opt.is_enabled
  );

  // 맞춤 시간표 버튼 클릭 핸들러
  const handleCustomOrderClick = () => {
    if (isLoadingAdminOptions) return; // 로딩 중이면 무시

    if (isCustomOrderEnabled) {
      router.push("/custom-order");
    } else {
      alert("현재 접수가 마감되었습니다.");
    }
    setIsMenuOpen(false);
  };

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
      // 로그아웃 후 메뉴 닫기
      setIsMenuOpen(false);
      // 로그인 페이지로 리다이렉트
      router.push("/auth");
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
    <div className="w-full min-h-screen text-gray-900 bg-[#F3E9E7]">
      {/* 상단 고정 바 */}
      {/* <header
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
          
          <div className="hidden md:flex gap-2">
            <Link href="/shop">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                템플릿 상점
              </p>
            </Link>

            <Link href="/portfolio">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                포트폴리오
              </p>
            </Link>

            <button
              onClick={handleCustomOrderClick}
              disabled={isLoadingAdminOptions}
              className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition min-w-[140px] disabled:opacity-70"
            >
              {isLoadingAdminOptions ? "..." : "맞춤형 시간표 제작"}
            </button>
            <Link href="/my-page">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                마이페이지
              </p>
            </Link>

            <Link href="/work-schedule">
              <p className="bg-white text-gray-800 font-medium px-4 py-2 rounded-lg hover:bg-gray-300 transition">
                작업 일정표
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
                  href="/portfolio"
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
                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                      />
                    </svg>
                    <span className="font-medium">포트폴리오</span>
                  </div>
                </Link>

                <button
                  onClick={handleCustomOrderClick}
                  className="w-full text-left px-4 py-3 text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100"
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
                    <span className="font-medium">
                      {isLoadingAdminOptions ? "..." : "맞춤형 시간표 제작"}
                    </span>
                  </div>
                </button>
                <Link
                  href="/my-page"
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
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <span className="font-medium">마이페이지</span>
                  </div>
                </Link>

                <Link
                  href="/work-schedule"
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
                        d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                    <span className="font-medium">작업 일정표</span>
                  </div>
                </Link>

                <Link
                  href="/mobile-install"
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
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-medium">모바일 버전 안내</span>
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
      </header> */}
      <MainHeader />
      <TestComponent />
      <KeyFeaturesSection items={keyFeatureList} />
      <ReviewSection items={reviews} />
      <GallerySection />

      {/* Footer CTA Section */}
      <section className="bg-gradient-to-br from-orange-400 to-orange-500 py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            일정에 묶이지 말고,
            <br />
            창작에 집중하세요.
          </h2>
          <p className="text-lg md:text-xl text-white/90 mb-8">
            버튜버의 시간을 바꾸는 시간표, 테미스.
            <br />
            지금 바로 시작하세요.
          </p>
          <button className="bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 px-12 rounded-full text-lg transition-colors shadow-lg hover:shadow-xl">
            지금 바로 신청하기
          </button>
        </div>
      </section>
    </div>
  );
}
