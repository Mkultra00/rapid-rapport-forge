import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function DsarSheet({
  text,
  onOpenChange,
}: {
  text: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!text} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto bg-card">
        <SheetHeader className="px-1">
          <SheetTitle>Deletion request</SheetTitle>
        </SheetHeader>
        <pre className="mono-tag mt-3 whitespace-pre-wrap rounded-xl bg-surface-2/60 p-4 text-[11px] leading-relaxed">
          {text}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Generated locally. Nothing is sent — copy it into your own mail client.
        </p>
        <Button
          className="mt-3 w-full"
          onClick={() => {
            if (text) void navigator.clipboard?.writeText(text);
          }}
        >
          Copy to clipboard
        </Button>
      </SheetContent>
    </Sheet>
  );
}
