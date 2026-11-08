import { motion } from "framer-motion";
import { ArrowDown, ArrowRight, Download } from "lucide-react";
import { profile } from "../../data/profile";
import { useUniverse } from "../../store/universe";
import { scrollToSection } from "../../hooks/useScrollStations";
import SocialLinks from "../ui/SocialLinks";
import NetworkGlobe from "../hero/NetworkGlobe";

const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
const item = {
  hidden: { opacity: 0, y: 22, filter: "blur(6px)" },
  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

export default function HeroSection() {
  const done = useUniverse((s) => s.introDone);
  const lite = useUniverse((s) => s.mode === "lite");
  const atTop = useUniverse((s) => s.station === 0);
  const [first, ...rest] = profile.headline.split(". ");
  const second = rest.join(". ");

  return (
    <section
      id="home"
      data-station="0"
      className="pointer-events-none relative flex min-h-[100svh] items-center pt-24 pb-24 lg:pt-28"
    >
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate={done ? "show" : "hidden"}
          className="pointer-events-auto max-w-xl self-start max-lg:pt-4 lg:self-center"
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
            variants={item}
            className="mt-6 font-display text-[2.4rem] leading-[1.05] font-semibold tracking-tight text-fg [text-shadow:0_2px_30px_rgba(2,4,10,0.9)] sm:text-6xl lg:text-[4rem]"
          >
            {first}
            {second && "."}
            {second && (
              <>
                <br />
                <span className="text-gradient">{second}</span>
              </>
            )}
          </motion.h1>

          <motion.p variants={item} className="mt-5 font-mono text-[12px] tracking-wide text-cyan sm:text-sm">
            {profile.title}
          </motion.p>

          <motion.p
            variants={item}
            className="mt-5 text-base leading-relaxed text-fg-muted [text-shadow:0_1px_20px_rgba(2,4,10,0.95)] sm:text-lg"
          >
            {profile.intro}
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => scrollToSection("projects")} className="btn-primary group">
              Explore Projects
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </button>
            {profile.resumeUrl && (
              <a href={profile.resumeUrl} download className="btn-ghost">
                <Download size={18} />
                Download Resume
              </a>
            )}
            <SocialLinks includeEmail={false} className="sm:ml-1" />
          </motion.div>
        </motion.div>

        {lite && (
          <div className="pointer-events-auto relative mx-auto aspect-square w-full max-w-[520px]">
            <NetworkGlobe />
          </div>
        )}
      </div>

      <motion.button
        type="button"
        onClick={() => scrollToSection("projects")}
        initial={{ opacity: 0 }}
        animate={{ opacity: done && atTop ? 1 : 0 }}
        transition={{ delay: atTop ? 0.6 : 0, duration: 0.6 }}
        className="pointer-events-auto absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-fg-subtle uppercase hover:text-fg"
      >
        Scroll to explore
        <ArrowDown size={14} className="animate-bounce motion-reduce:animate-none" />
      </motion.button>
    </section>
  );
}
