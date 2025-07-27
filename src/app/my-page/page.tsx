import ProtectedRoute from "@/components/auth/ProtectedRoute";

const MyPage = () => {
  return (
    <ProtectedRoute>
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">마이페이지</h1>
        <p>로그인된 사용자만 접근할 수 있는 페이지입니다.</p>
      </div>
    </ProtectedRoute>
  );
};

export default MyPage;
