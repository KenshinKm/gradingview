import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectPage } from "@/components/subject-page";
import { SUBJECT_CONFIG, isSubjectEnabled } from "@/lib/subject-config";

export const metadata: Metadata = {
  title: SUBJECT_CONFIG.math.metaTitle,
  description: SUBJECT_CONFIG.math.metaDescription,
};

export default function MathPage() {
  if (!isSubjectEnabled("math")) notFound();
  return <SubjectPage subject="math" />;
}
