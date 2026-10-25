# 🍳 Kitchen Crew

A tiny, dependency-free web app for sharing kitchen duties and garbage collection in a shared house.

- Duties assigned to housemates, each shown as a cute animal
- Add or remove duties and housemates
- Reroll button for next week's assignments
- Scoreboard with points
- High-contrast, keyboard-friendly, light and dark mode

## Run it

Open `index.html` in a browser. No build step needed.

## Tests

End-to-end tests (Playwright) open the real page in a browser and click through it.

```bash
npm install
npx playwright install chromium   # one time
npm test
```

They cover duties, scoreboard, reroll, adding/removing duties and housemates, saving, dark mode and basic accessibility.

## Files

- `index.html`: structure
- `style.css`: styling and themes
- `app.js`: logic (data is saved in the browser's `localStorage`)

Data stays in each person's own browser; it isn't shared between devices.
