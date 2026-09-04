import { LegalPage, LSection } from "@/components/legal-page";

export const metadata = { title: "Privacy Policy" };

const UPDATED = "September 3, 2026";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        This Privacy Policy explains what information GradingView collects,
        how we use it, and the choices you have. We built GradingView to
        handle your schoolwork the way we&apos;d want our own handled: kept
        private, used only to grade your work, and easy to delete.
      </p>

      <LSection title="1. What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account info:</strong> your email address and an
            encrypted password (handled by our authentication provider,
            Supabase; we never see or store your raw password).
          </li>
          <li>
            <strong>Your submissions:</strong> the grading materials and work
            you upload or paste, including rubrics, instructions, essays,
            worksheets, photos, and any text extracted from them, plus the
            assignment title, course, and citation style if you provide them.
          </li>
          <li>
            <strong>Grading results:</strong> the estimated grade, breakdown,
            and feedback generated for each attempt, and your usage history
            (which assignments you graded and when).
          </li>
          <li>
            <strong>Billing info:</strong> if you subscribe, Stripe processes
            your payment. We receive your subscription status and billing
            period, never your full card number.
          </li>
          <li>
            <strong>Basic technical data:</strong> standard server logs (IP
            address, timestamps, error logs) used for security and
            reliability.
          </li>
        </ul>
      </LSection>

      <LSection title="2. How we use it">
        <p>
          We use your information to: run the grading pipeline (read your
          materials, evaluate your work, return a result); maintain your
          account, dashboard, and grading history; enforce plan limits and
          process billing; secure the Service and prevent abuse; and respond
          if you contact support.
        </p>
        <p>
          We do not sell your data, and we do not use your submissions to
          advertise to you or to anyone else.
        </p>
      </LSection>

      <LSection title="3. AI processing">
        <p>
          To generate an estimate, the text and images you submit are sent to
          our AI provider (currently Anthropic) solely to produce your
          grading result. We configure this processing to evaluate your
          submission; it is not used by GradingView to train our own models.
          Our AI provider processes the request under its own API terms,
          which restrict use of API data for model training.
        </p>
      </LSection>

      <LSection title="4. Where your data lives">
        <p>
          Your account data, grading history, and uploaded files are stored
          with Supabase (Postgres database and file storage), protected by
          row-level security policies that restrict every record and file to
          your own account. Our application servers are the only thing that
          can act on your behalf, using credentials that never reach your
          browser. Data is encrypted in transit.
        </p>
      </LSection>

      <LSection title="5. Sharing">
        <p>
          We share data only with the vendors that make the Service work,
          each bound to use it solely to provide their service to us:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong>: database, authentication, file
            storage
          </li>
          <li>
            <strong>Anthropic</strong> (or another configured AI provider):
            processes your submission to generate a grading estimate
          </li>
          <li>
            <strong>Stripe</strong>: payment processing for paid plans
          </li>
          <li>
            <strong>Vercel</strong>: application hosting
          </li>
        </ul>
        <p>
          We do not share your submissions with your school, instructor, or
          any other student. We disclose information if required by law, or
          to protect the security of the Service.
        </p>
      </LSection>

      <LSection title="6. Your choices">
        <p>
          You can delete any assignment and its associated files and grading
          history at any time from your dashboard. This permanently removes
          it from our database and storage. To delete your entire account,
          email us and we&apos;ll remove your data, subject to what we&apos;re
          required to retain for billing/legal records.
        </p>
      </LSection>

      <LSection title="7. Children's privacy">
        <p>
          GradingView is intended for high school and college students. We do
          not knowingly collect personal information from children under 13.
          If you believe a child under 13 has created an account, contact us
          and we&apos;ll delete it.
        </p>
      </LSection>

      <LSection title="8. Cookies">
        <p>
          We use only the cookies necessary to keep you signed in
          (authentication session cookies). We don&apos;t use third-party
          advertising or tracking cookies.
        </p>
      </LSection>

      <LSection title="9. Changes">
        <p>
          If we make material changes to this policy, we&apos;ll update the
          date at the top of this page.
        </p>
      </LSection>

      <LSection title="10. Contact">
        <p>
          Questions about this policy or your data? Email{" "}
          <a
            href="mailto:support@grading-view.com"
            className="underline hover:text-ink"
          >
            support@grading-view.com
          </a>
          .
        </p>
      </LSection>
    </LegalPage>
  );
}
