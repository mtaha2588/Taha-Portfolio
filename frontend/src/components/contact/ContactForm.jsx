import { useRef, useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { apiRequest, isApiConfigured } from "../../lib/api";
import { exhibits } from "../../store/exhibits";
import { profile } from "../../data/profile";

const EMPTY = { name: "", email: "", company: "", message: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Please enter your name.";
  if (!EMAIL_RE.test(f.email.trim())) e.email = "Please enter a valid email address.";
  if (f.message.trim().length < 10) e.message = "Please write at least 10 characters.";
  return e;
}

/**
 * Contact form → POST /api/contact (FastAPI). The backend validates,
 * filters spam (honeypot + timing + rate limit), stores the message and
 * optionally emails it. Client-side checks mirror the server's rules.
 */
export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [message, setMessage] = useState("");
  const startedAt = useRef(null);
  const honeypot = useRef(null);

  const update = (k) => (e) => {
    startedAt.current ??= Date.now();
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setStatus("sending");
    setMessage("");
    try {
      await apiRequest("/api/contact", {
        method: "POST",
        body: {
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || null,
          message: form.message.trim(),
          website: honeypot.current?.value || null,
          elapsed_ms: startedAt.current ? Date.now() - startedAt.current : null,
        },
      });
      setStatus("sent");
      setForm(EMPTY);
      startedAt.current = null;
      exhibits.set((s) => ({ contactPulse: s.contactPulse + 1 }));
    } catch (err) {
      setStatus("error");
      setErrors(err.fieldErrors || {});
      setMessage(err.message);
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/[0.07] p-6 text-center" role="status">
        <CheckCircle2 size={36} className="mx-auto text-emerald-300" aria-hidden="true" />
        <p className="mt-3 font-display text-xl font-semibold text-fg">Message received</p>
        <p className="mt-1 text-sm text-fg-muted">Thank you for reaching out. I'll reply by email as soon as I can.</p>
        <button type="button" onClick={() => setStatus("idle")} className="btn-ghost mt-5 !px-4 !py-2 !text-sm">
          Send another message
        </button>
      </div>
    );
  }

  const field = (k) => ({
    id: `contact-${k}`,
    value: form[k],
    onChange: update(k),
    "aria-invalid": errors[k] ? "true" : undefined,
    "aria-describedby": errors[k] ? `contact-${k}-error` : undefined,
    className: "field",
  });
  const err = (k) =>
    errors[k] && (
      <p id={`contact-${k}-error`} className="mt-1 text-xs text-red-300">
        {errors[k]}
      </p>
    );

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor="contact-name" className="text-xs font-medium text-fg-muted">
          Name
        </label>
        <input {...field("name")} autoComplete="name" maxLength={100} className="field mt-1.5" />
        {err("name")}
      </div>
      <div>
        <label htmlFor="contact-email" className="text-xs font-medium text-fg-muted">
          Email
        </label>
        <input {...field("email")} type="email" autoComplete="email" maxLength={254} className="field mt-1.5" />
        {err("email")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="contact-company" className="text-xs font-medium text-fg-muted">
          Company <span className="text-fg-subtle">(optional)</span>
        </label>
        <input {...field("company")} autoComplete="organization" maxLength={120} className="field mt-1.5" />
        {err("company")}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="contact-message" className="flex justify-between text-xs font-medium text-fg-muted">
          Message <span className="font-mono text-fg-subtle">{form.message.length}/5000</span>
        </label>
        <textarea
          {...field("message")}
          rows={5}
          maxLength={5000}
          className="field mt-1.5 resize-y"
          placeholder="Tell me about your project, role or idea…"
        />
        {err("message")}
      </div>

      {/* Honeypot: hidden from people, bots tend to fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input ref={honeypot} id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && message && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200 sm:col-span-2"
        >
          {message}
          {(!isApiConfigured || /reach|long|available/.test(message)) && profile.email && (
            <>
              {" "}
              You can also email me directly at{" "}
              <a href={`mailto:${profile.email}`} className="underline">
                {profile.email}
              </a>
              .
            </>
          )}
        </div>
      )}

      <button type="submit" disabled={status === "sending"} className="btn-primary justify-center sm:col-span-2">
        {status === "sending" ? (
          <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        ) : (
          <Send size={16} aria-hidden="true" />
        )}
        {status === "sending" ? "Transmitting…" : "Send message"}
      </button>
    </form>
  );
}
