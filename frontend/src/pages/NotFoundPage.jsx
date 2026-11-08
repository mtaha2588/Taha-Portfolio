import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import BackgroundCanvas from "../components/layout/BackgroundCanvas";

export default function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <BackgroundCanvas />
      <p className="eyebrow">Signal lost · 404</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-fg sm:text-5xl">This sector doesn't exist</h1>
      <p className="mt-4 max-w-md text-fg-muted">The page you're looking for isn't here. Head back to the universe.</p>
      <Link to="/" className="btn-primary mt-8">
        Return to the universe
      </Link>
    </main>
  );
}
