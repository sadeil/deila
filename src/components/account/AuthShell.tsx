import Image from "next/image";

export function AuthShell({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="container grid items-center gap-12 py-12 md:py-20 lg:grid-cols-2">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-display-md">{title}</h1>
        <div className="mt-10">{children}</div>
      </div>
      <div className="relative mx-auto hidden aspect-[4/5] w-full max-w-md overflow-hidden rounded-arch bg-blush lg:block">
        <Image src="/brand/illustrations/printer.svg" alt="" fill sizes="40vw" className="object-cover" />
      </div>
    </div>
  );
}
