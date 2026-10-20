# Ongoing maintenance and F-Droid eligibility

F-Droid's [Inclusion Policy](https://f-droid.org/docs/Inclusion_Policy/),
Quality Control item 6, requires at least three months of active development.
It lists exceptions for apps with proven users, authors already maintaining
other F-Droid apps, and apps developed only for an event. There is no weekly
commit quota. Acceptance remains the reviewers' decision.

[MR !52931](https://gitlab.com/fdroid/fdroiddata/-/merge_requests/52931)
was closed on October 20, 2026 for this reason. The reviewer invited reopening
once eligible. The earliest local commit is dated October 15, 2026, so January
15, 2027 is the three-calendar-month milestone, subject to actual continued
development. Existing family use may support the users exception if documented
honestly; do not invent download counts, testimonials, or testing evidence.

## Weekly automation

T3 task **Wave Remote weekly maintenance** runs Tuesdays at 09:00 UTC, starting
October 27, 2026, and reports into the thread **Find F-Droid Submission Thread**
(`620b3de9-7d3b-42ad-9ed8-f1befc2fbd53`). This is an app scheduler task, not a
GitHub Actions workflow; it requires the T3 environment and repository access.

Each run should inspect recent work and open issues, choose one justified
improvement, implement it, and run relevant checks using Bun. Prioritize real
bugs, security and compatibility, accessibility, meaningful regression coverage,
and accurate user documentation. Patch dependencies only for a concrete reason
and preserve the F-Droid source-build and reproducibility requirements.

Commit and push focused, passing changes directly to main. Preserve unrelated
edits. Report the commit, user benefit, checks and unresolved limitations here.
Do not force activity: no empty commits, date-only reports, cosmetic churn,
unnecessary version bumps, or fabricated maintenance evidence. If nothing useful
can safely be completed, report the findings and blocker without a commit.
Do not run dev servers or builds, publish releases, deploy the site, post external
comments, or reopen the MR as part of this recurring task.

## Before requesting re-review

- Recheck the current inclusion policy and summarize actual development since
  October 15 with links to useful commits, issues resolved and releases.
- Collect voluntary, truthful user feedback and real-device testing evidence.
- Resolve outstanding bugs and review dependency and Android compatibility.
- Follow RELEASING.md for an explicitly requested release; verify the latest
  recipe against the released APK and F-Droid reproducibility requirements.
- Refresh the fdroiddata recipe to the latest release and pass its checks.
- Prepare a short reopening explanation referencing the policy and evidence.
  Ask the user before posting it or reopening the MR.
