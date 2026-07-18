# keepalive/

GitHub auto-disables scheduled workflows after **60 days** of repository
inactivity. Each agent's scheduled ping (see `.github/workflows/ping-<agent>.yml`)
writes a timestamp here as `keepalive/<agent>.txt` — but only when the repo has
been quiet for 45+ days. That commit counts as activity and keeps the schedule
alive.

- **One file per agent** (`claude.txt`, `codex.txt`, …) so multiple concurrently
  scheduled agents never collide.
- The first agent to run in a quiet stretch commits and resets the timer; the
  others then see recent activity and skip — so there's no concurrent-push race.

These files are committed on purpose — **do not** add them to `.gitignore`.
