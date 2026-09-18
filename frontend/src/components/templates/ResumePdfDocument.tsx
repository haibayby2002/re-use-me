import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ResumeSections, TemplateId } from "../../types";

const harvardStyles = StyleSheet.create({
  page: { padding: 42, fontSize: 10.5, fontFamily: "Times-Roman", color: "#000" },
  header: { marginBottom: 12, textAlign: "center" },
  name: { fontSize: 16, fontFamily: "Times-Bold", marginBottom: 2 },
  contact: { fontSize: 9.5, color: "#333" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 4,
    paddingBottom: 2,
  },
  entry: { marginBottom: 6 },
  entryHeading: { fontFamily: "Times-Bold", marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
});

const modernStyles = StyleSheet.create({
  page: { padding: 42, fontSize: 10.5, fontFamily: "Helvetica", color: "#1f2937" },
  header: { marginBottom: 14, borderBottomWidth: 2, borderBottomColor: "#22c07d", paddingBottom: 8 },
  name: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 },
  contact: { fontSize: 9.5, color: "#6b7280" },
  section: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    color: "#159a64",
    marginBottom: 4,
  },
  entry: { marginBottom: 6 },
  entryHeading: { fontFamily: "Helvetica-Bold", color: "#111827", marginBottom: 2 },
  bulletRow: { flexDirection: "row", marginBottom: 1.5 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
});

export default function ResumePdfDocument({
  sections,
  template,
}: {
  sections: ResumeSections;
  template: TemplateId;
}) {
  const s = template === "modern" ? modernStyles : harvardStyles;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {sections.other.length > 0 && (
          <View style={s.header}>
            {sections.other.map((line, i) => (
              <Text key={i} style={i === 0 ? s.name : s.contact}>
                {line}
              </Text>
            ))}
          </View>
        )}

        {sections.summary.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Summary</Text>
            {sections.summary.map((p, i) => (
              <Text key={i}>{p}</Text>
            ))}
          </View>
        )}

        {sections.experience.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Experience</Text>
            {sections.experience.map((entry, i) => (
              <View key={i} style={s.entry}>
                {entry.heading && <Text style={s.entryHeading}>{entry.heading}</Text>}
                {entry.bullets.map((b, j) => (
                  <View key={j} style={s.bulletRow}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {sections.projects.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Projects</Text>
            {sections.projects.map((p, i) => (
              <View key={i} style={s.bulletRow}>
                <Text style={s.bulletDot}>•</Text>
                <Text style={s.bulletText}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {sections.skills.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Skills</Text>
            <Text>{sections.skills.join(", ")}</Text>
          </View>
        )}

        {sections.education.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Education</Text>
            {sections.education.map((e, i) => (
              <Text key={i}>{e}</Text>
            ))}
          </View>
        )}

        {sections.certifications.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Certifications</Text>
            {sections.certifications.map((c, i) => (
              <Text key={i}>{c}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
