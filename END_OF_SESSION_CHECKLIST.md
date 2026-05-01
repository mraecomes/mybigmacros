# End of Session Checklist — myBigMACros

> Run through these 6 steps at the end of every coding session to keep
> STATUS.md and CHANGELOG.md up to date everywhere.

---

## Step 1 — Update STATUS.md in Cursor

1. Open `STATUS.md` in Cursor
2. Click the **Markdown** tab to switch to edit mode
3. Update the progress tables using these status indicators:
   - `⬜` Not started
   - `🔄` In progress
   - `✅` Complete
   - `🚫` Blocked
4. Update **Last Updated** date and **Next Session Goal**
5. Save with **Cmd + S**

---

## Step 2 — Update CHANGELOG.md in Cursor

1. Open `CHANGELOG.md` in Cursor
2. Click the **Markdown** tab to switch to edit mode
3. Add a new entry at the very top (below the header) using this format:

```
## [Date] — Session Title

### Added
- Brief description of new features or files created

### Changed
- Brief description of anything modified

### Fixed
- Brief description of bugs resolved

### Decisions Made
- Any important decisions made and why
```

4. Save with **Cmd + S**

---

## Step 3 — Commit and Push via Claude Code

Type this in Claude Code in the Cursor terminal:

```
Please create a docs branch, commit the updated STATUS.md and
CHANGELOG.md, push to GitHub, create a PR, and let me know
when it's ready to merge.
```

Approve any prompts Claude Code asks along the way.

---

## Step 4 — Merge the PR on GitHub

1. Go to the PR link Claude Code gives you
2. Click **Merge pull request**
3. Click **Confirm merge**
4. Click **Delete branch**

---

## Step 5 — Pull Latest Changes Locally

Type this in Claude Code after merging:

```
Please pull the latest changes from main.
```

Approve the prompt and confirm it says "up to date" or lists the files pulled in.

---

## Step 6 — Confirm Vercel Deployment (After Any Merge to Main)

Type this in Claude Code:

```
Please use Vercel MCP to confirm the latest deployment succeeded
and the production URL is live.
```

If the deployment failed, do not close the session — ask Claude Code to inspect the build logs and resolve the issue before finishing.

---

## Why All 6 Steps Matter

| Step | What It Updates |
|------|----------------|
| Steps 1–2 | Your local files in Cursor |
| Step 3 | Pushes updates to GitHub |
| Step 4 | Merges them into main on GitHub |
| Step 5 | Syncs your local Mac folder with GitHub |
| Step 6 | Confirms the live Vercel URL is working — the portfolio surface hiring managers will see |

After Step 6, everything is identical everywhere — your Mac, GitHub, and the live Vercel URL all reflect the latest stable build. Claude Code will never read an outdated file!

---

## Additional: After Any Significant Decision in Claude Chat

If you made a product or architecture decision in Claude Chat that affects how something should be built:

1. Open the relevant file in Cursor (PRD.md, ARCHITECTURE.md, or CLAUDE.md)
2. Update it to reflect the decision
3. Follow Steps 3–5 above to commit and sync

Claude Code reads these files at the start of every session. If a decision lives only in a Claude Chat conversation and not in a file, Claude Code won't know about it.

---

## Quick Reference — Status Indicators

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not started |
| 🔄 | In progress |
| ✅ | Complete |
| 🚫 | Blocked |

---

## Quick Reference — Commit Message Format

| Type | When to Use | Example |
|------|------------|---------|
| `feat` | New feature built | `feat: add restaurant locator screen` |
| `fix` | Bug fixed | `fix: resolve Mapbox web render crash` |
| `chore` | Config or install change | `chore: install NativeWind` |
| `docs` | Documentation update | `docs: update STATUS.md` |
| `style` | UI or styling change | `style: update badge colors` |
| `refactor` | Code restructure, no behavior change | `refactor: extract badge logic to utils` |
| `data` | Data prep or import change | `data: import MenuStat CSV to Supabase` |

---

*Last updated: April 2026*
*myBigMACros — Mallory Comes*
