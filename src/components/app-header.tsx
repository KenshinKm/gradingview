import Link from "next/link";
import { Logo } from "./logo";

export function AppHeader({
  plan,
  remaining,
}: {
  plan: string;
  remaining: number | "unlimited";
}) {
  return (
    <header className="border-b border-slate-100">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-sm text-ink-muted sm:inline">
            <span className="font-medium capitalize text-ink-soft">
              {plan.replace("_", " ")}
            </span>{" "}
            · {remaining === "unlimited" ? "dev mode" : `${remaining} left`}
          </span>
          <Link href="/dashboard" className="btn-ghost">
            Dashboard
          </Link>
          <form action="/auth/signout" method="post">
            <button className="btn-ghost" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
