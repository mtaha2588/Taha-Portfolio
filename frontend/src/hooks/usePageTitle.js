import { useEffect } from "react";
import { profile } from "../data/profile";

/** Sets the browser tab title for the current page. */
export function usePageTitle(title) {
  useEffect(() => {
    const owner = profile.name && profile.name !== "Your Name" ? profile.name : "AI Developer";
    document.title = title ? `${title} | ${owner}` : `${owner} | AI Developer & Automation Engineer`;
  }, [title]);
}
