import { cn } from "@/lib/utils";
import { TEntry } from "@/types/time-table/data";
import { SizeProps } from "@/utils/utils";
import { Trash2 } from "lucide-react";
import { buttonVariants, entryCardVariants } from "./styles";

interface EntryCardProps {
  entry: TEntry;
  entryIndex: number;
  showHeader?: boolean;
  showDeleteButton?: boolean;
  onDelete?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary" | "secondary";
  size?: SizeProps;
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
  size = "sm",
}) => {
  return (
    <div
      className={cn(
        entryCardVariants({ variant }),
        "relative flex flex-col gap-3 has-[.delete-button:hover]:[&>.overlay]:opacity-100",
        className
      )}
    >
      <div className="overlay absolute z-20 inset-0 bg-timetable-primary opacity-0 transition-opacity pointer-events-none flex justify-center items-center rounded-lg">
        <Trash2 className=" h-24 w-24 text-timetable-card-bg " />
      </div>
      {showDeleteButton && (
        <div className="flex justify-between">
          <p className="text-sm pl-1">방송 {entryIndex + 1}</p>
        </div>
      )}

      {children}
      {showDeleteButton && showHeader && onDelete && (
        <button
          type="button"
          className={cn(
            "delete-button transition-colors flex gap-1 items-center justify-center group hover:cursor-pointer text-timetable-card-bg font-medium",
            buttonVariants({
              variant: "light",
              size,
              fullWidth: true,
            })
          )}
          onClick={onDelete}
          aria-label="엔트리 삭제"
        >
          <Trash2 className="w-3.5 h-3.5 text-timetable-card-bg" />
        </button>
      )}
    </div>
  );
};
