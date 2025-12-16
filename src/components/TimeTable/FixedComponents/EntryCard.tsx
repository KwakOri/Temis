import { cn } from "@/lib/utils";
import { TEntry } from "@/types/time-table/data";
import { Trash2 } from "lucide-react";
import { entryCardVariants } from "./styles";

interface EntryCardProps {
  entry: TEntry;
  entryIndex: number;
  showHeader?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "secondary";
}

export const EntryCard: React.FC<EntryCardProps> = ({
  entry,
  entryIndex,
  showHeader = false,
  showDeleteButton = false,
  onDelete,
  children,
  className,
  variant = "default",
}) => {
  return (
    <div className={cn(entryCardVariants({ variant }), className)}>
      <div className="space-y-3">{children}</div>
      {showHeader && (
        <div className="flex justify-end items-center">
          {/* <span className="text-sm font-bold text-gray-900">
            방송 {entryIndex + 1}
          </span> */}
          {showDeleteButton && onDelete && (
            <button
              type="button"
              className="w-full h-6 rounded-lg bg-timetable-primary hover:bg-timetable-primary-hover transition-colors flex items-center justify-center group"
              onClick={onDelete}
              aria-label="엔트리 삭제"
            >
              <Trash2 className="w-3.5 h-3.5 text-timetable-card-bg" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
