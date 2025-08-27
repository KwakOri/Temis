"use client";

import TimeTableEditor from "./_components/EditableComponents/TimeTableEditor";
import "./_styles/index.css";

const TestComponent = () => {
  return (
    <section
      className="relative w-full h-[100vh]"
      style={{
        transform: "scale(1)",
      }}
    >
      <TimeTableEditor />
    </section>
  );
};

export default TestComponent;
