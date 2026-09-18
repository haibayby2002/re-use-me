import type { ResumeSections } from "../../types";

export default function HarvardTemplate({ sections }: { sections: ResumeSections }) {
  return (
    <div
      className="mx-auto max-w-[8.5in] bg-white p-10 text-[13px] leading-snug text-black"
      style={{ fontFamily: "'Times New Roman', Georgia, serif" }}
    >
      {sections.other.length > 0 && (
        <header className="mb-4 text-center">
          {sections.other.map((line, i) => (
            <p key={i} className={i === 0 ? "text-xl font-bold tracking-wide" : "text-[12px] text-gray-700"}>
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
              {entry.heading && <p className="font-semibold">{entry.heading}</p>}
              {entry.bullets.length > 0 && (
                <ul className="ml-4 list-disc space-y-0.5">
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
          <ul className="ml-4 list-disc space-y-0.5">
            {sections.projects.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Section>
      )}

      {sections.skills.length > 0 && (
        <Section title="Skills">
          <p>{sections.skills.join(", ")}</p>
        </Section>
      )}

      {sections.education.length > 0 && (
        <Section title="Education">
          <ul className="ml-4 list-disc space-y-0.5">
            {sections.education.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </Section>
      )}

      {sections.certifications.length > 0 && (
        <Section title="Certifications">
          <ul className="ml-4 list-disc space-y-0.5">
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
      <h2 className="mb-1 border-b border-black text-[13px] font-bold uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}
