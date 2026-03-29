import { LucideIcon } from "lucide-react";

interface AdminTabHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export default function AdminTabHeader({
  title,
  description,
  icon: Icon,
  children,
}: AdminTabHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-dark-gray shrink-0 mt-1" />
        )}
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-dark-gray">
            {title}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-dark-gray mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {children && (
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
}
