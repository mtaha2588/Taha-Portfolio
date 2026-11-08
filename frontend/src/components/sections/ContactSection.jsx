import { Mail } from "lucide-react";
import { profile } from "../../data/profile";
import { GithubIcon, LinkedinIcon } from "../ui/BrandIcons";
import ContactForm from "../contact/ContactForm";
import EnvSection from "./EnvSection";

export default function ContactSection() {
  const channels = [
    profile.email && { href: `mailto:${profile.email}`, label: "Email", value: profile.email, Icon: Mail },
    profile.linkedin && {
      href: profile.linkedin,
      label: "LinkedIn",
      value: "View profile",
      Icon: LinkedinIcon,
      external: true,
    },
    profile.github && {
      href: profile.github,
      label: "GitHub",
      value: "View repositories",
      Icon: GithubIcon,
      external: true,
    },
  ].filter(Boolean);

  return (
    <EnvSection
      id="contact"
      station={8}
      eyebrow="Contact · Collaboration"
      title="Let's build something intelligent"
      intro={profile.availability.open ? profile.availability.detail : "Send a message and I'll get back to you."}
      wide
    >
      {channels.length > 0 && (
        <ul className="mb-6 grid gap-2 sm:grid-cols-3">
          {channels.map(({ href, label, value, Icon, external }) => (
            <li key={label}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex items-center gap-3 rounded-lg border border-line p-3 transition-colors hover:border-cyan/40 hover:bg-white/[0.03]"
              >
                <Icon size={18} className="shrink-0 text-cyan" />
                <span className="min-w-0">
                  <span className="block text-xs text-fg-subtle">{label}</span>
                  <span className="block truncate text-sm text-fg">{value}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <ContactForm />
    </EnvSection>
  );
}
