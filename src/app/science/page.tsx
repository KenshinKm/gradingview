import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SubjectPage } from "@/components/subject-page";
import { SUBJECT_CONFIG, isSubjectEnabled } from "@/lib/subject-config";

export const metadata: Metadata = {
  title: SUBJECT_CONFIG.science.metaTitle,
  description: SUBJECT_CONFIG.science.metaDescription,
};

export default function SciencePage() {
  if (!isSubjectEnabled("science")) notFound();
  return <SubjectPage subject="science" />;
}
