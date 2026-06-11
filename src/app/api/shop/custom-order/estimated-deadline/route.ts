import { supabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const formatDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export async function GET() {
  try {
    const { data: latestOrder, error } = await supabase
      .from("custom_timetable_orders")
      .select("deadline")
      .not("deadline", "is", null)
      .not("status", "in", '("completed","cancelled")')
      .order("deadline", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Estimated deadline fetch error:", error);
      return NextResponse.json(
        { error: "예상 마감일 조회 중 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    const latestDeadline = latestOrder?.deadline ?? null;
    const baseDate = latestDeadline ? new Date(latestDeadline) : new Date();
    const estimatedDeadline = formatDateInputValue(addDays(baseDate, 7));

    return NextResponse.json(
      {
        latestDeadline,
        estimatedDeadline,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Estimated deadline fetch error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
