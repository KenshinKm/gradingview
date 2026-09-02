import Link from "next/link";
import Image from "next/image";
import logo from "../../public/logo.png";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center ${className}`}
      aria-label="GradingView home"
    >
      <Image
        src={logo}
        alt="GradingView"
        priority
        className="h-7 w-auto sm:h-8"
        sizes="140px"
      />
    </Link>
  );
}
