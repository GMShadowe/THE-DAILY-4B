# Build Taste

A skill by [Anish](https://anishfn.ink) for design engineers. It opens a canvas on your machine where you save screenshots, links and notes, and say why each one works. Everything is kept in your project, and your coding agent turns it into a taste skill it follows when it builds.

```bash
npx skills add anishfn/build-taste
```

Then ask your agent: **"Use Build Taste in this project."**

Works in Claude Code, Codex and Cursor. More at [build-taste.anishfn.ink](https://build-taste.anishfn.ink).

## How it works

1. Your agent starts a canvas on `127.0.0.1` and opens it in your browser.
2. Paste screenshots, drop images, add links and notes. Click a thing to write what you like about it, and drag across things to group the ones that belong together.
3. It all saves into your project as you go. Click **Finish and build taste** and your agent reads the board, looks at every picture and link, and writes your taste into a skill it follows from then on. Correct it later and it sharpens the rules.

## What it writes

```
.claude/skills/taste/        (.agents/skills/taste/ for Codex, Cursor and others)
  SKILL.md        your taste, kept by your agent
  board/
    BOARD.md      everything on the board, group by group, in your words
    board.json    the same, exact
    images/       the pictures, and each site's preview
```

Your agent's `SKILL.md` is never overwritten by the canvas. Run the skill again any time: the board opens where you left it.

## Good to know

- Needs Node.js 20 or newer. No packages to install.
- The canvas binds to `127.0.0.1` with a one-time link, and nothing you save leaves your machine. To show a site's preview, it reads that page's title and picture.
- Closing the page without finishing keeps your board; your agent hears about it after 20 quiet minutes.
