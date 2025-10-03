import { cn } from "@/lib/utils";
import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export const GlassCard = ({ children, className, hover = false, onClick, style }: GlassCardProps) => {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "glass rounded-2xl p-6 shadow-lg",
        hover && "glass-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
};
