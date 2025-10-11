"use client";

import TimeTableEditor from "./_components/_uneditable/TimeTableEditor";
import "./_styles/index.css";

const TestComponent = () => {
  return (
    <section
      className="relative w-full h-[85vh]"
      style={{
        transform: "scale(1)",
      }}
    >
      <TimeTableEditor />
    </section>
  );
};

export default TestComponent;
