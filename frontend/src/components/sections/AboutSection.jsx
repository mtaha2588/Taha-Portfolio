import { Globe2 } from "lucide-react";
import { profile } from "../../data/profile";
import HoloPortrait from "../ui/HoloPortrait";
import EnvSection from "./EnvSection";

export default function AboutSection() {
  const { about, availability } = profile;
  return (
    <EnvSection id="about" station={7} eyebrow="About Me" title="Practical AI, built end to end">
      <div className="mb-8 grid items-center gap-6 sm:grid-cols-[minmax(0,14.5rem)_1fr] sm:gap-7">
        <HoloPortrait className="mx-auto w-full max-w-[15rem] sm:max-w-none" />
        <div className="text-center sm:text-left">
          <p className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-[1.7rem]">{profile.name}</p>
          <ul className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start" aria-label="Roles">
            {profile.title.split(" | ").map((role) => (
              <li key={role} className="chip !border-holo-cyan/30 !bg-holo-blue/10 !text-fg">
                {role}
              </li>
            ))}
          </ul>
          {availability.open && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping-soft absolute inset-0 rounded-full bg-signal" />
                <span className="relative h-2 w-2 rounded-full bg-signal" />
              </span>
              {availability.label}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 text-sm leading-relaxed text-fg-muted sm:text-[15px]">
        {about.paragraphs.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <h3 className="mt-6 text-xs font-semibold tracking-wider text-fg uppercase">Technical interests</h3>
      <ul className="mt-2.5 flex flex-wrap gap-2">
        {about.interests.map((i) => (
          <li key={i} className="chip">
            {i}
          </li>
        ))}
      </ul>

      <h3 className="mt-6 text-xs font-semibold tracking-wider text-fg uppercase">How I work</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {about.principles.map((p) => (
          <li key={p.title} className="rounded-lg border border-line bg-white/[0.02] p-3">
            <p className="text-sm font-medium text-fg">{p.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-fg-muted">{p.text}</p>
          </li>
        ))}
      </ul>

      {availability.open && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-400/25 bg-emerald-400/[0.06] p-4">
          <Globe2 size={18} className="mt-0.5 shrink-0 text-emerald-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-emerald-100">{availability.label}</p>
            <p className="mt-0.5 text-xs text-fg-muted">{availability.detail}</p>
          </div>
        </div>
      )}
    </EnvSection>
  );
}
