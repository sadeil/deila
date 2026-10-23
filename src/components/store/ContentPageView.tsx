import { Reveal } from "../ui/Reveal";

/** Renders admin-authored plain text safely (no HTML injection): blank lines become paragraphs. */
export function ContentPageView({ eyebrow, title, body, aside }: { eyebrow: string; title: string; body: string; aside?: React.ReactNode }) {
  return (
    <div className="container pb-24 pt-12 md:pt-20">
      <Reveal className="mx-auto max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="display mt-3 text-display-lg">{title}</h1>
        <div className="hairline my-10" />
        <div className="space-y-5 text-[17px] leading-loose text-plum-700">
          {body.split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}
        </div>
        {aside}
      </Reveal>
    </div>
  );
}
