import { Mail } from "lucide-react";
import { profile } from "../../data/profile";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";

/** Icon links for every social profile that is filled in profile.js. */
export default function SocialLinks({ className = "", includeEmail = true }) {
  const links = [
    profile.linkedin && { href: profile.linkedin, label: "LinkedIn", Icon: LinkedinIcon, external: true },
    profile.github && { href: profile.github, label: "GitHub", Icon: GithubIcon, external: true },
    includeEmail && profile.email && { href: `mailto:${profile.email}`, label: "Email", Icon: Mail },
  ].filter(Boolean);

  if (!links.length) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {links.map(({ href, label, Icon, external }) => (
        <a
          key={label}
          href={href}
          aria-label={label}
          title={label}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="grid h-10 w-10 place-items-center rounded-lg border border-line-strong bg-ink-900/60 text-fg-muted transition-all hover:-translate-y-0.5 hover:border-cyan/50 hover:text-fg"
        >
          <Icon size={18} />
        </a>
      ))}
    </div>
  );
}
