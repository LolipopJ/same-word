# Same word

## Code and UI Conventions

- Code, comments, commit messages, and PR text are in English.
- Comments explain non-obvious constraints; do not narrate the code.
- Use the [daisyui skill](.agents/skills/daisyui/SKILL.md) for all frontend UI work. Start with daisyUI components/classes (`btn`, `card`, `input`), then use Tailwind utilities for spacing, sizing, and responsiveness. Avoid custom structures or alternative UI frameworks unless necessary.
- Keep components modular and concerns separate. Put behavior in the layer that owns it rather than duplicating it.

## Verification

The user's testing preference takes precedence. Adding a test and running checks are separate decisions.

- Add only minimal tests that reproduce the reported regression or protect behavior whose breakage would otherwise go unnoticed. Do not add scaffolding or defensive code for hypothetical failures.
- For documentation-only edits, review the diff and referenced paths; skip application tests and builds.
- For strings, constants, prompts, config values, and other trivial code edits, ask after completing the change whether a small functional check is wanted; do not self-test.
- Otherwise, run focused tests for touched modules only when requested or when changing at least four core backend/frontend interaction files. Hardcoded-only edits do not count toward that threshold. Do not default to the full suite or repeat a passing check without a new reason.

## Completion

- Keep documentation and OpenSpec artifacts aligned with any behavior changed by the task.
- Report what changed, which checks actually ran, and any unverified behavior.
- After coding tasks, use `caveman-commit` to generate an English Conventional Commit message, such as `fix(inference): stop cancelled jobs`. Generating a message does not authorize staging or committing changes.
