"use client";

import { useState } from "react";
import FlexibleCard from "../../components/AutoResizeTextCard/AutoResizeTextCard";

const TestPage = () => {
  const [text, setText] = useState<string>("");

  return (
    <>
      <FlexibleCard text={text} />
      <textarea value={text} onChange={(e) => setText(e.currentTarget.value)} />
    </>
  );
};

export default TestPage;
