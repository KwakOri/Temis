import { cn } from "@/utils/utils";
import { ChangeEvent } from "react";
import { inputVariants } from "./styles";

interface OfflineMemoCardProps {
  content: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}

const OfflineMemoCard = ({ content, onChange }: OfflineMemoCardProps) => {
  return (
    <textarea
      value={content || ""}
      onChange={onChange}
      placeholder="휴방 메모를 입력하세요..."
      className={cn(inputVariants({ variant: "default" }), "resize-none block")}
      rows={3}
      maxLength={200}
    />
  );
};

export default OfflineMemoCard;
