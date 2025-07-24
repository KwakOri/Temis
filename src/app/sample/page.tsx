"use client";

import TimeTableEditor from "@/app/sample/_components/TimeTableEditor";
import "./_styles/index.css";

const TestPage = () => {
  return (
    <div className={`fixed inset-0 w-full h-full`}>
      <TimeTableEditor />
    </div>
  );
};

export default TestPage;
