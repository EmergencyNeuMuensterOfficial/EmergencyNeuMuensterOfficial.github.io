import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/Logo.webp";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-3">
      <Image
        src={logo}
        alt="OnboardX"
        width={compact ? 36 : 40}
        height={compact ? 36 : 40}
        className="h-9 w-9 rounded-lg object-cover"
        priority
      />
      <span className="text-sm font-bold tracking-tight text-discord-white">
        OnboardX
      </span>
    </Link>
  );
}
