import { Link } from "@tanstack/react-router";
import { Search, Vault, Bell, FlaskConical } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { initCanary, useCanary } from "@/lib/store";

const TABS = [
  { to: "/", label: "Check", icon: Search },
  { to: "/vault", label: "Vault", icon: Vault },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/demo", label: "Demo", icon: FlaskConical },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { sightings } = useCanary();
  const unread = sightings.filter((s) => !s.acknowledged).length;

  useEffect(() => {
    void initCanary();
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/70 bg-background/90 px-5 py-4 backdrop-blur">
        <div className="flex items-baseline gap-2">
          <span className="mono-tag text-[13px] font-bold tracking-[0.3em] text-primary">
            CANARY
          </span>
          <span className="text-xs text-muted-foreground">{title}</span>
        </div>
        <span className="mono-tag text-[10px] uppercase tracking-widest text-muted-foreground">
          offline capable
        </span>
      </header>

      <main className="flex-1 px-5 pb-28 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto flex w-full max-w-[430px] items-stretch border-t border-border/70 bg-background/95 backdrop-blur">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="relative flex flex-1 flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground transition-colors"
            activeProps={{ className: "text-primary" }}
            activeOptions={{ exact: t.to === "/" }}
          >
            <t.icon className="h-5 w-5" strokeWidth={1.75} />
            {t.label}
            {t.label === "Alerts" && unread > 0 && (
              <span className="absolute right-[26%] top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unread}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
