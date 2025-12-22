import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CategoryChipProps {
  href: string;
  label: string;
}

const Title = () => {
  return (
    <p
      style={{
        fontFamily: "Paperlogy",
      }}
      className="w-60 text-left text-[40px] font-semibold text-[#1B1612]"
    >
      TEMIS
    </p>
  );
};

const categories = [
  { href: "/shop", label: "SHOP" },
  { href: "/portfolio", label: "PROTFOLIO" },
  { href: "/work-schedule", label: "PROGRESS" },
];

const CategoryChip = ({ href, label }: CategoryChipProps) => {
  return (
    <Link href={href}>
      <p className="text-2xl h-12 px-8 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 ">
        {label}
      </p>
    </Link>
  );
};

const CategoryBar = () => {
  return (
    <div className="flex items-center px-1 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
      {categories.map((category, i) => {
        return (
          <CategoryChip key={i} href={category.href} label={category.label} />
        );
      })}
    </div>
  );
};

const OptionBar = () => {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
  };

  if (loading) {
    return (
      <div className="flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
        <div className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
        </div>
      </div>
    );
  }

  if (user) {
    // 로그인 상태: 마이페이지 + 로그아웃
    return (
      <div className="flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
        <Link href={"/my-page"}>
          <p className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 ">
            My Page
          </p>
        </Link>
        <button onClick={handleLogout}>
          <p className="text-xl text-white font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-[#FC712B] brightness-100 hover:brightness-75 ">
            Log Out
          </p>
        </button>
      </div>
    );
  }

  // 로그아웃 상태: 로그인 + 회원가입
  return (
    <div className="flex items-center px-1.5 gap-[10px] h-15 rounded-full bg-[#F5EDEC] border-2 border-[#E2D4C4] shadow-[0_2px_3.4px_rgba(0,0,0,0.25)]">
      <Link href={"/auth"}>
        <p className="text-2xl font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-transparent hover:bg-black/10 ">
          Log In
        </p>
      </Link>
      <Link href={"/auth?mode=signup"}>
        <p className="text-xl text-white font-semibold h-11 px-5 rounded-full flex justify-center items-center bg-[#FC712B] brightness-100 hover:brightness-75 ">
          Sign Up
        </p>
      </Link>
    </div>
  );
};

const NavBar = () => {
  return (
    <div className="max-w-[1440px] w-full flex flex-col items-center">
      <div className="w-full h-28 px-9 flex justify-between items-center">
        <Title />
        <CategoryBar />
        <OptionBar />
      </div>
    </div>
  );
};

export default NavBar;
