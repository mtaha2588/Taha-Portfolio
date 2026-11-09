/**
 * ============================================================
 *  YOUR PERSONAL DETAILS — edit this file first.
 * ============================================================
 * Everything personal on the site is read from here, so you only
 * update it in one place.
 *
 * Empty strings ("") are treated as "not provided": the matching
 * link or button is hidden instead of showing a broken link.
 * While running `npm run dev`, the browser console lists any fields
 * that are still empty. That reminder never appears in production.
 */
export const profile = {
  name: "Muhammad Taha",
  // Shown in the navbar logo. Usually your initials.
  initials: "MT",

  title: "AI Developer | AI Automation Engineer | Full-Stack Developer",
  headline: "Building Intelligent Systems. Automating the Future.",
  intro:
    "I design and build practical AI-powered software: agents that handle real business workflows, machine learning applied to real-world data, and full-stack web applications that connect it all together.",

  // Contact & social. Use full URLs for LinkedIn and GitHub.
  email: "",
  linkedin: "",
  github: "",

  // Résumé: put your PDF at frontend/public/resume.pdf and set
  // resumeUrl to "/resume.pdf". While empty, the hero button reads
  // "Request Resume" and takes visitors to the contact form instead.
  resumeUrl: "",

  availability: {
    // Set open to false to hide the green "available" indicator.
    open: true,
    label: "Available for remote opportunities",
    detail: "Open to full-time remote roles and freelance or contract projects.",
  },

  about: {
    paragraphs: [
      "I'm a developer focused on the point where artificial intelligence meets everyday business and real-world problems. I'm less interested in AI as a buzzword and more interested in what it can reliably do: read and route information, automate repetitive operations, surface patterns in data, and give people better information to make decisions.",
      "My work spans the full stack. I build Python back ends and APIs, integrate large language models such as the OpenAI and Claude APIs, apply classical machine learning where it fits, and ship web interfaces in React. I like taking a project from a rough problem statement to a working system that someone can actually use.",
      "The projects on this site are my active portfolio work. Each case study explains the problem, the approach and the architecture honestly, including its current status, so you can see how I think and how I build.",
    ],
    // Shown in the About section and the 3D identity panel.
    interests: [
      "AI agents & LLM tooling",
      "Machine learning on geospatial data",
      "Business process automation",
      "Full-stack web applications",
    ],
    principles: [
      {
        title: "Practical over impressive",
        text: "I start from the problem and the people affected by it, then choose the simplest technology that solves it reliably.",
      },
      {
        title: "Automation with oversight",
        text: "Automated workflows should be observable, logged and easy to review, with a human in the loop where decisions matter.",
      },
      {
        title: "Honest scoping",
        text: "I communicate clearly about what is built, what is in progress and what is planned, with no inflated claims.",
      },
      {
        title: "Always learning",
        text: "AI tooling changes quickly. I keep building, testing new approaches and documenting what I learn along the way.",
      },
    ],
  },
};

/** Returns the names of profile fields that are still empty or placeholders. */
export function missingProfileFields() {
  const missing = [];
  if (!profile.name || profile.name === "Your Name") missing.push("name");
  if (!profile.email) missing.push("email");
  if (!profile.linkedin) missing.push("linkedin");
  if (!profile.github) missing.push("github");
  if (!profile.resumeUrl) missing.push("resumeUrl (optional)");
  return missing;
}
