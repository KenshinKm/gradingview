import { LegalPage, LSection } from "@/components/legal-page";

export const metadata = { title: "Terms of Service" };

const UPDATED = "September 3, 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={UPDATED}>
      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of
        GradingView (&quot;GradingView,&quot; &quot;we,&quot; &quot;us&quot;),
        available at grading-view.com and related subdomains (the
        &quot;Service&quot;). By creating an account or using the Service,
        you agree to these Terms. If you don&apos;t agree, don&apos;t use the
        Service.
      </p>

      <LSection title="1. What GradingView is">
        <p>
          GradingView analyzes grading materials you provide (a rubric,
          assignment instructions, an answer key, etc.) together with your
          completed work, and returns an <strong>AI-generated estimate</strong>{" "}
          of how that work might be graded: a percentage, a letter grade, a
          category breakdown, and suggested improvements.
        </p>
        <p>
          The estimate is not produced or reviewed by your instructor or
          institution, is not affiliated with any school, and is not a
          guarantee of any kind. Your instructor&apos;s actual grade may
          differ, sometimes significantly. GradingView can make mistakes.
        </p>
      </LSection>

      <LSection title="2. Not for use during an exam">
        <p>
          GradingView is a study and revision tool for work you have already
          completed (drafts, homework, practice material). It is{" "}
          <strong>
            not intended for use during an active or proctored exam
          </strong>{" "}
          or in any way that would violate your school&apos;s academic
          integrity policy. You&apos;re responsible for using the Service in a
          way that complies with your institution&apos;s rules.
        </p>
      </LSection>

      <LSection title="3. Accounts">
        <p>
          You need an account to use the Service. You&apos;re responsible for
          the accuracy of the information you provide and for keeping your
          login credentials secure. You must be old enough to enter into this
          agreement in your jurisdiction, or have a parent or guardian&apos;s
          permission to use the Service. GradingView is not directed at
          children under 13, and we do not knowingly collect data from
          children under 13.
        </p>
      </LSection>

      <LSection title="4. Your content">
        <p>
          You keep ownership of everything you upload or paste, including
          rubrics, assignments, essays, photos, and any other materials
          (&quot;Your Content&quot;). By submitting Your Content, you grant us
          a limited license to process it, including sending it to our AI
          provider and storing it in your private account, solely to provide
          the Service to you.
        </p>
        <p>
          Don&apos;t upload anything you don&apos;t have the right to share,
          or anything unlawful, and don&apos;t use the Service to generate or
          submit work that misrepresents someone else&apos;s authorship as
          your own outside the intended study/revision use.
        </p>
      </LSection>

      <LSection title="5. Plans, billing, and cancellation">
        <p>
          GradingView offers a free plan (one lifetime grade) and paid
          subscription plans billed monthly through Stripe. Successful
          grading attempts, both initial grades and re-grades, count
          against your plan&apos;s limit for the current billing period; a
          failed or errored attempt never does. Paid usage resets on your
          Stripe billing period (the date you subscribed), not the calendar
          month.
        </p>
        <p>
          Subscriptions renew automatically until canceled.{" "}
          <strong>
            All purchases are non-refundable, including partial billing
            periods.
          </strong>{" "}
          You can cancel anytime from your dashboard&apos;s billing portal.
          Canceling stops future renewals, and you keep access through the
          end of the period you already paid for.
        </p>
      </LSection>

      <LSection title="6. Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Create multiple accounts to obtain more than one free lifetime
            grade
          </li>
          <li>
            Attempt to bypass, disable, or interfere with usage limits,
            security, or rate limiting
          </li>
          <li>Upload malicious files or attempt to compromise the Service</li>
          <li>
            Use the Service for anything unlawful or that infringes someone
            else&apos;s rights
          </li>
          <li>Resell or redistribute access to the Service</li>
        </ul>
      </LSection>

      <LSection title="7. Disclaimers and limitation of liability">
        <p>
          THE SERVICE AND ITS OUTPUT ARE PROVIDED &quot;AS IS,&quot; WITHOUT
          WARRANTIES OF ANY KIND. WE DO NOT WARRANT THAT ESTIMATES ARE
          ACCURATE, COMPLETE, OR WILL MATCH ANY GRADE YOU ACTUALLY RECEIVE.
        </p>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, GRADINGVIEW IS NOT LIABLE
          FOR ANY INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING
          ACADEMIC OUTCOMES OR GRADES, ARISING FROM YOUR USE OF THE SERVICE.
          OUR TOTAL LIABILITY FOR ANY CLAIM IS LIMITED TO THE AMOUNT YOU PAID
          US IN THE 12 MONTHS BEFORE THE CLAIM AROSE.
        </p>
      </LSection>

      <LSection title="8. Termination">
        <p>
          You can stop using the Service and delete your assignments and data
          at any time from your dashboard. We may suspend or terminate
          accounts that violate these Terms, including abuse of the free
          tier or usage limits.
        </p>
      </LSection>

      <LSection title="9. Changes">
        <p>
          We may update these Terms as the Service evolves. Material changes
          will be reflected by an updated date at the top of this page.
          Continuing to use the Service after a change means you accept the
          updated Terms.
        </p>
      </LSection>

      <LSection title="10. Contact">
        <p>
          Questions about these Terms? Email{" "}
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
