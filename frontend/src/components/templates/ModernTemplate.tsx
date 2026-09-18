import type { ResumeSections } from "../../types";

export default function ModernTemplate({ sections }: { sections: ResumeSections }) {
  return (
    <div
      className="mx-auto max-w-[8.5in] bg-white p-10 text-[13px] leading-relaxed text-gray-800"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      {sections.other.length > 0 && (
        <header className="mb-5 border-b-2 border-brand-500 pb-3">
          {sections.other.map((line, i) => (
            <p key={i} className={i === 0 ? "text-2xl font-bold text-gray-900" : "text-[12px] text-gray-500"}>
              {line}
            </p>
          ))}
        </header>
      )}

      {sections.summary.length > 0 && (
        <Section title="Summary">
          {sections.summary.map((p, i) => (
            <p key={i} className="mb-1">
              {p}
            </p>
          ))}
        </Section>
      )}

      {sections.experience.length > 0 && (
        <Section title="Experience">
          {sections.experience.map((entry, i) => (
            <div key={i} className="mb-3">
              {entry.heading && <p className="font-semibold text-gray-900">{entry.heading}</p>}
              {entry.bullets.length > 0 && (
                <ul className="ml-4 list-disc space-y-0.5 text-gray-700">
                  {entry.bullets.map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </Section>
      )}

      {sections.projects.length > 0 && (
        <Section title="Projects">
          <ul className="ml-4 list-disc space-y-0.5 text-gray-700">
            {sections.projects.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {sections.skills.length > 0 && (
        <Section title="Skills">
          <div className="flex flex-wrap gap-1.5">
            {sections.skills.map((s, i) => (
              <span key={i} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[12px] text-brand-700">
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}

      {sections.education.length > 0 && (
        <Section title="Education">
          <ul className="ml-4 list-disc space-y-0.5 text-gray-700">
            {sections.education.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Section>
      )}

      {sections.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="ml-4 list-disc space-y-0.5 text-gray-700">
            {sections.certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="mb-1.5 text-[13px] font-bold uppercase tracking-wide text-brand-600">{title}</h2>
      {children}
    </section>
  );
}
