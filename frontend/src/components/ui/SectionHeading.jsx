import Reveal from "./Reveal";

export default function SectionHeading({ eyebrow, title, description, align = "left" }) {
  const centered = align === "center";
  return (
    <Reveal className={`mb-12 max-w-2xl md:mb-16 ${centered ? "mx-auto text-center" : ""}`}>
      <p className={`eyebrow flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-cyan" aria-hidden="true" />
        {eyebrow}
      </p>
      <h2 className="mt-4 font-display text-3xl font-semibold tracking-tight text-fg sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">
        {title}
      </h2>
      {description && <p className="mt-5 text-base leading-relaxed text-fg-muted sm:text-lg">{description}</p>}
    </Reveal>
  );
}
