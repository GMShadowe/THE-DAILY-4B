---
name: taste
description: A living record of one person's taste in interfaces, read from their tasteboard and from what they say while building. Use whenever adding, editing or reviewing anything a person will see (layout, components, copy, motion, icons, color, type), and update this file whenever they reveal more of their taste.
---

# Taste

This file is a living record of one person's taste. It starts almost empty and gets better in two ways: from their board (`board/`, the screenshots, sites and notes they saved) and from what they say while you build with them. You are the one who keeps it.

Tasteboard writes `board/` and replaces it when the board changes. It never touches this file once it exists.

## How to keep this file

1. **Load it before any change a person will see.** Follow what's written here over your own defaults. Where it says nothing, do the plain thing and keep it small.
2. **Read the board when it has something new.** `board/BOARD.md` lists every thing on the board, group by group. A thing is new when its id isn't under "From the board" below. For each new thing:
   - a picture: open its file in `board/images/` and look at it;
   - a site: open the link and look at the page itself, not only its picture;
   - a note, or the "why" line under a thing: those are the person's own words, and they outrank what you see.

   Things in one group were put together on purpose. A group with a name was made by hand, and the name is their own word for what its things share. Ask what a group shares before asking what each thing is.
3. **Write what repeats, in numbers.** One screenshot is an example. Three that agree are a rule. Measure: hex values, px, radii, type sizes and weights, line heights, durations, curves, columns, the space between things. "Clean" and "modern" are not rules. "Radius 24 on blocks, 12 on 36px controls" is. Say which things each rule came from. Where the board disagrees with itself, write both down and ask.
4. **Listen while you build.** When the person corrects, praises or rejects something, that is taste. Fix the work, then refine the rule it touches (change a rule before adding one that contradicts it) and add a dated line to the taste log: their words in quotes, and what changed. What they say in the code beats what the board suggests.
5. **Keep what was sent back.** Something tried and rejected goes under "Tried and sent back" with their words, so it isn't tried a second time.
6. **Write only what you know.** Don't fill a section from one example, or from your own preference. An empty section is better than an invented one. Dates are written out (2026-10-14), never "today".

## Taste

What has been asked for, and so what every change must respect.

- **A modern newspaper, laid out as a bento grid.** Their words: "bento grid style, but newspaper like design, from the font to the colours", "modern newspaper ui with bento layout", "newspaper colours". The grid is the structure; the paper, ink, rules and type are the skin. Neither a plain card dashboard nor a one-column broadsheet. (`a4b92dd0`, `ccf75b62`, `830a5210`, `ea6d2485`, `61d27d0e`, `3dc90763`)
- **Newsprint, not screen.** Cream paper, near-black ink, one warm red-orange accent. No gradients, glows, tinted category colors or shadows. (`ea6d2485`, `61d27d0e`, `830a5210`)
- **Rules, not cards.** Cells are boxed by 1px hairline rules with square corners and a small gutter between them, like Tablet's front page. (`ea6d2485`, `61d27d0e`)
- **Photos in black and white.** Both newspapers run their photos grayscale (Tablet also uses a red duotone for portraits). (`ea6d2485`, `61d27d0e`)
- **Onboarding reads like Airbnb's interest picker:** big left-aligned question, gray one-line explanation, pill chips with an icon, selected chips get a heavy ink outline rather than a fill, a running "n/N selected" count bottom-left, a solid ink button bottom-right. (`1e9195e6`)

## Visual system

| Token | Value | From |
| --- | --- | --- |
| paper (page) | `#EAE4D6` | Tablet page ≈ `#EEE8DA`, Monster Sushi ≈ `#F2F0E6` (`ea6d2485`, `61d27d0e`) |
| paper (cell) | `#F4F0E6` | lighter than the page so the bento reads; Tablet cells sit on the page color |
| ink | `#1B1A17` | Tablet / Monster body text |
| ink muted | `#5E5A52` | Tablet dek text |
| ink faint | `#6B655A` | bylines, captions. Darkened from `#8E887C`, which measured 3.1–3.5:1; this clears 4.5:1 on page and cell paper |
| rule | `#CDC4B2`, 1px | Tablet cell borders. Decorative structure only |
| control edge | `#857F72`, 1px | Form input borders, which need 3:1 against both paper tones (3.14 and 3.50:1) |
| accent | `#C2401F` | Tablet red labels, stat boxes, duotones ≈ `#E0533D`; unroot orange ≈ `#F2602A` (`ea6d2485`, `3dc90763`). Darkened from `#D9482B` so 10–11px labels clear 4.5:1 on cell paper |
| accent soft | `#F6D8C8` | unroot peach tile (`3dc90763`) |
| radius, cells | 0 | both newspapers (`ea6d2485`, `61d27d0e`); the unroot bento's 16px radius is outvoted |
| radius, buttons | 8px; chips fully round | Airbnb Save button and chips (`1e9195e6`) |
| gutter | 12px | Tablet cell gaps |
| one filled ink cell | ink background, paper text | Tablet "Listen to Tablet" box (`ea6d2485`); unroot black tiles (`3dc90763`) |

Light only: the board is all paper colors and nothing dark-themed.

## Type

- **Sans: Okine** (geometric, round O, six weights) is the named favourite: why "font" (`35018875`). Okine isn't on Google Fonts; use **Outfit** as the closest free geometric stand-in until Okine is licensed. Use it for the masthead, section labels, numbers, navigation and all UI.
- **Serif for the news itself.** Tablet sets every headline in a serif, centred under its photo; Monster Sushi uses a serif too. Use **Newsreader** for headlines, decks and summaries. (`ea6d2485`, `61d27d0e`)
- **Masthead:** a single huge heavy word across the top, between rules (Tablet "NEWS", Monster "NEWS" with issue number left and address right). Uppercase, weight 800, tight tracking. (`ea6d2485`, `61d27d0e`)
- **Labels:** uppercase sans, 10–11px, weight 600, tracking ≈ 0.12em, in the accent color (Tablet "FEATURED COLUMNIST", "UPCOMING ELECTION DATES"); section heads in ink with a rule under them (Monster "NUEVO SERVICIO"). 
- **Bylines:** "BY NAME", uppercase sans ≈ 9–10px, tracking ≈ 0.1em, faint ink, under the deck. (`ea6d2485`)
- **Big numerals:** stats set huge in the sans, accent color, with a tiny caption under (Tablet "20,800", "21"; unroot "25M", "12K"). (`ea6d2485`, `3dc90763`)
- **Onboarding heading:** sans, ≈ 30px, weight 600, left aligned; subtitle ≈ 16px in muted ink. (`1e9195e6`)

## Layout

- Bento grid of ruled cells with a 12px gutter. Big stories get big cells with a photo and a centred serif headline; the smallest cells are just a centred headline and byline (Tablet's bottom row). (`ea6d2485`)
- Mid-size cells pair a photo on the left with the headline beside it (Monster "Monster Delivery", "ROBATA"). (`61d27d0e`)
- Stat-style cells: an accent-outlined box with one big number (Tablet "20,800"). (`ea6d2485`)
- Masthead block above the grid: rules above and below, small metadata to its left and right. (`61d27d0e`)

## Motion

_Nothing on the board yet._

## Copy

- Short uppercase labels; "BY …" bylines. (`ea6d2485`)
- Onboarding asks a direct question as the title ("What are you into?") and says what the choice is for in one line. (`1e9195e6`)

## Tried and sent back

- 2026-10-28: a single-column "readable" broadsheet with serif type and hairlines ("there is a difference between a real newspaper and a webpage filled with blog cards"; then "the ui is no where near modern"). The type and rules were right; the plain column wasn't.
- 2026-10-29: a dark bento with colored glows, category-tinted tiles, watermark icons and text laid over photos ("so overstimulating and just NOT modern").
- 2026-10-29: a neutral gray/black Geist bento (friends: "the UI is TERRIBLE"). Too generic, with no newspaper character.

## From the board

- `3dc90763` picture: unroot studio bento (peach, orange, black tiles, "Aa" specimen, big stats). Took: the bento structure, big numerals, the filled ink cell, the accent soft tint. Its rounded corners are outvoted.
- `35018875` site, Okine Sans (Pinterest): why "font". Took: a geometric round sans for display and UI.
- `1e9195e6` site, Mecil Amberov's interests screen: why "onboarding". Took the whole onboarding pattern above.
- `ea6d2485` picture: Tablet magazine NEWS/SCIENCE pages. Took the cream paper, ruled cells, red accent labels, centred serif headlines, B&W and duotone photos, bylines, stat boxes and the ink box.
- `a4b92dd0` note: "bento grid style, but newspaper like design, from the font to the colours".
- `61d27d0e` picture: Monster Sushi printed NEWS sheet. Took the masthead with side metadata and rules, the grayscale photos, photo-left rows and the ruled section heads.
- `ccf75b62` note: "modern newspaper ui with bento layout".
- `830a5210` note: "newspaper colours".

## Taste log

- 2026-10-29: first board read (8 references). Rules above written from it.
- 2026-10-29: whole app rebuilt to these rules: Outfit + Newsreader, paper/ink/red tokens, ruled square cells, masthead with issue number and city/weather sides, tagline "All the news a 4B model sees fit to print", red-boxed weather stat, ink brief cell, grayscale photos (color on hover), section tabs with a red underline, Airbnb-style onboarding.
- 2026-10-29: interface pass with the better-* skills. Ink faint darkened and a control edge token added for contrast, inputs at 16px, springs at bounce 0, a 1px black/10 outline on photos. The look is unchanged; these are correctness fixes, not taste changes.
