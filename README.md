# Mental Math Master: Times Tables

A calm times-tables practice site for kids, live at **https://tables.noemie.world**.

Four levels, then a final check:

| Level | Tables | Then |
|---|---|---|
| 1 | 2s, 10s, 5s | Learn → Practice → Test |
| 2 | 3s, 4s, 6s | Learn → Practice → Test |
| 3 | 7s, 8s, 9s | Learn → Practice → Test |
| 4 | 11s, 12s | Learn → Practice → Test |
| Final check | all 66 facts | 60 right to pass |

A test opens the next level at 20 right out of the last 25, with every new fact
answered right at least once. A wrong answer shows the right one and how to build
it from a fact already known. Behind the scenes every fact also keeps a
spaced-repetition box, which fills the progress board.

Designed for kids who get overstimulated: no animation, nothing moves on by
itself, no red or green, minimal words, a dim mode and plain lettering.

## Privacy

No accounts, no tracking, no requests to other sites. Progress is saved only in
the learner's own browser (a "Move to another device" code copies it across).

## Files

- `index.html` is the whole app (one file). `fonts/` holds the two fonts it uses.
- `source/` has the parts it's built from: `engine.js` (the course logic, no UI),
  `index.src.html` (the screens) and `build.py`.
  - `python3 build.py` builds a local copy with tester tools (add `?dev` to the address).
  - `node test/simulate.js` runs simulated learners through the whole course and
    checks every rule.

## Fonts

[Atkinson Hyperlegible](https://brailleinstitute.org/freefont) (Braille Institute)
and [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) (Patrick
Wagesreiter), both under the SIL Open Font License 1.1; see `fonts/OFL-*.txt`.
