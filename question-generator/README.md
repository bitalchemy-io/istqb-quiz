# Fragen-Generator (Ollama)

Admin-only tool — not part of the public istqb-quiz app. Generates new
ISTQB-style multiple-choice questions from the syllabus text
(`src/data/theory-N.md`) via Ollama, lets you review/accept them, then
writes, commits, and pushes accepted questions into `src/data/quizData.json`.

## Running on the Mac Mini (Docker)

The container needs `git` push access to this repo, so the SAME checkout
that already has `gh auth setup-git` configured (see the main repo's
homeserver notes — this is the same setup used for `vokabel-song`) is
bind-mounted into the container. `REPO_ROOT` is overridden via an
environment variable to point at that mounted path, since inside the
container `fragen_generator.py`'s own directory is not the repo checkout.

Before the first deploy, run `gh auth setup-git` once on the host (if not already done):
```bash
gh auth setup-git
```
This writes the credential helper directive `credential.helper = !gh auth git-credential` to your `~/.gitconfig`.

Then build and run the container:
```bash
cd question-generator
docker build -t istqb-question-generator .
docker run -d \
  --name istqb-question-generator \
  -p 8010:8010 \
  -v /absolute/path/to/istqb-quiz:/repo-checkout \
  -v ~/.gitconfig:/root/.gitconfig:ro \
  -v ~/.config/gh:/root/.config/gh:ro \
  -e REPO_ROOT=/repo-checkout \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  -e OLLAMA_MODEL=llama3.1:latest \
  --add-host=host.docker.internal:host-gateway \
  istqb-question-generator
```

The two mounts ensure `git push` works inside the container: `~/.gitconfig` (read-only) carries the credential helper directive, and `~/.config/gh` (read-only) holds the authentication token that `gh auth git-credential` uses.

Access via Tailscale only: `http://100.73.147.87:8010` — do not publish
this port to the LAN/public internet, since it has unauthenticated git
push access to a public repo.

## Running directly (simpler alternative, no Docker)

Since `REPO_ROOT` defaults to this script's own parent directory, running
it straight from within the real repo checkout needs no environment
variable and no volume mount:

```bash
cd question-generator
pip install -r requirements.txt
python3 -m uvicorn app:app --host 0.0.0.0 --port 8010
```
