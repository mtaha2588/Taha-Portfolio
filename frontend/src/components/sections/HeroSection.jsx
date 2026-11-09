import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Download, Mail } from "lucide-react";
import { profile } from "../../data/profile";
import { useUniverse } from "../../store/universe";
import { scrollToSection } from "../../hooks/useScrollStations";
import SocialLinks from "../ui/SocialLinks";
import HoloPortrait from "../ui/HoloPortrait";
import NetworkGlobe from "../hero/NetworkGlobe";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.15 } } };
const item = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * First screen: a professional introduction. Name, roles, tagline, a
 * short "about me", focus areas and calls to action on the left; the
 * holographic portrait stands in front of the 3D globe on the right
 * (above the text on phones).
 */
export default function HeroSection() {
  const done = useUniverse((s) => s.introDone);
  const lite = useUniverse((s) => s.mode === "lite");
  const atTop = useUniverse((s) => s.station === 0);
  const [first, ...rest] = profile.headline.split(". ");
  const second = rest.join(". ");
  const roles = profile.title.split(" | ");

  return (
    <section
      id="home"
      aria-labelledby="hero-name"
      data-station="0"
      className="pointer-events-none relative flex min-h-[100svh] items-center pt-24 pb-24 lg:pt-28"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate={done ? "show" : "hidden"}
          className="pointer-events-auto order-2 max-w-xl lg:order-1"
        >
          {profile.availability.open && (
            <motion.div variants={item}>
              <button
                type="button"
                onClick={() => scrollToSection("contact")}
                className="glass inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-2.5 text-sm text-fg-muted transition-colors hover:text-fg"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping-soft absolute inset-0 rounded-full bg-signal" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-signal" />
                </span>
                {profile.availability.label}
              </button>
            </motion.div>
          )}

          <motion.h1
            id="hero-name"
            variants={item}
            className="mt-6 font-display text-[2.7rem] leading-[1.02] font-semibold tracking-tight text-fg [text-shadow:0_2px_30px_rgba(2,4,10,0.9)] sm:text-6xl lg:text-[4.4rem]"
          >
            {profile.name}
          </motion.h1>

          <motion.ul variants={item} className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Roles">
            {roles.map((role, i) => (
              <li
                key={role}
                className="flex items-center gap-3 font-mono text-[12px] tracking-wide text-holo-cyan sm:text-[13px]"
              >
                {i > 0 && <span className="h-1 w-1 rounded-full bg-holo-purple" aria-hidden="true" />}
                {role}
              </li>
            ))}
          </motion.ul>

          <motion.p
            variants={item}
            className="mt-6 font-display text-[1.6rem] leading-tight font-medium tracking-tight text-fg [text-shadow:0_2px_24px_rgba(2,4,10,0.9)] sm:text-[2rem]"
          >
            {first}
            {second && "."} {second && <span className="text-gradient">{second}</span>}
          </motion.p>

          <motion.p
            variants={item}
            className="mt-5 text-base leading-relaxed text-fg-muted [text-shadow:0_1px_20px_rgba(2,4,10,0.95)] sm:text-[17px]"
          >
            {profile.intro}
          </motion.p>

          <motion.div variants={item} className="mt-6">
            <p className="font-mono text-[10px] tracking-[0.28em] text-fg-subtle uppercase">Focus areas</p>
            <ul className="mt-2.5 flex flex-wrap gap-2">
              {profile.about.interests.map((interest) => (
                <li key={interest} className="chip !border-holo-cyan/25 !bg-holo-blue/10 !text-fg">
                  {interest}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => scrollToSection("projects")} className="btn-primary group">
              View Projects
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            <button type="button" onClick={() => scrollToSection("contact")} className="btn-ghost">
              <Mail size={18} />
              Get in Touch
            </button>
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} download className="btn-ghost">
                <Download size={18} />
                Resume
              </a>
            )}
            <SocialLinks includeEmail={false} className="sm:ml-1" />
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={done ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto relative order-1 mx-auto w-full max-w-[14rem] sm:max-w-[17rem] lg:order-2 lg:max-w-[21rem]"
        >
          {lite && (
            <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[170%] -translate-x-1/2 -translate-y-1/2">
              <NetworkGlobe />
            </div>
          )}
          <HoloPortrait large />
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={() => scrollToSection("projects")}
        initial={{ opacity: 0 }}
        animate={{ opacity: done && atTop ? 1 : 0 }}
        transition={{ delay: atTop ? 0.6 : 0, duration: 0.6 }}
        className="pointer-events-auto absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-fg-subtle uppercase hover:text-fg sm:flex"
      >
        Scroll to explore
        <ArrowDown size={14} className="animate-bounce motion-reduce:animate-none" />
      </motion.button>
    </section>
  );
}
