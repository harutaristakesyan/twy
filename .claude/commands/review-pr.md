---
description: Review a PR (current branch vs main, or a numbered PR via GitHub MCP) using code-reviewer + security-auditor + cdk-stack-reviewer where appropriate.
allowed-tools: Bash, Read, Grep, Glob
argument-hint: "[optional: PR number or branch name]"
---

You are reviewing a pull request. Argument: `$ARGUMENTS` (PR number, branch name, or empty for current branch).

## Steps

1. **Resolve the diff scope**:
   - If `$ARGUMENTS` is a number → use the github MCP to fetch PR #<n> diff.
   - If `$ARGUMENTS` is a string → `git diff main...$ARGUMENTS`.
   - If empty → `git diff main...HEAD` (review the current branch vs main).

2. **Print a one-paragraph summary** of what the PR does (skim file titles, infer the change).

3. **Spawn reviewers in parallel** based on what changed:
   - Always: `code-reviewer` subagent.
   - If any file under `apps/auth/`, `apps/infra/`, `packages/lambda-shared/src/middy/`, or anything touching IAM/SQL/Cognito → `security-auditor` subagent.
   - If any file under `apps/*/bin/` → `cdk-stack-reviewer` subagent.

4. **Aggregate** findings into a single ranked list:
   - BLOCKERs first
   - MAJORs next
   - MINORs last
   - Dedupe overlapping findings (the security and code reviewers will sometimes flag the same line).

5. **Verdict**: `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`. Justify in one sentence.

## Output template

```
## PR Summary
<one paragraph>

## Files reviewed
<count by package>

## Findings
- [BLOCKER] ...
- [MAJOR] ...
- [MINOR] ...

## Verdict
<APPROVE | REQUEST_CHANGES | COMMENT> — <one sentence>
```
