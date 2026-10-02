import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type QuickActionButtonProps = {
  title: string;
  description: string;
  icon: ReactNode;
  onClick?: () => void;
};

export function QuickActionButton({ title, description, icon, onClick }: QuickActionButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} className="flex h-auto flex-col items-start justify-start gap-2 border-slate-700 bg-slate-900/70 px-4 py-4 text-left text-slate-200 hover:bg-slate-800">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <span className="text-sm text-slate-400">{description}</span>
    </Button>
  );
}
