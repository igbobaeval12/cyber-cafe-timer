import { AlertCircle, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface StatusStateProps {
  state: "loading" | "error" | "empty";
  title: string;
  description?: string;
  onRetry?: () => void;
}

export function StatusState({ state, title, description, onRetry }: StatusStateProps) {
  return (
    <div className="flex min-h-[320px] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900/70">
        <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
          {state === "loading" ? (
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          ) : state === "error" ? (
            <AlertCircle className="h-8 w-8 text-red-400" />
          ) : (
            <Inbox className="h-8 w-8 text-slate-400" />
          )}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            {description ? <p className="text-sm text-slate-400">{description}</p> : null}
          </div>
          {state === "error" && onRetry ? (
            <Button onClick={onRetry} variant="secondary" className="mt-2">
              Retry
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
