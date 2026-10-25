const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const URL = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;

// Each test gets a fresh browser context, so localStorage starts empty.
test.beforeEach(async ({ page }) => {
  await page.goto(URL);
});

const cards = page => page.locator('#tasks .card');
const boardRows = page => page.locator('#board li');
const crewChips = page => page.locator('#crew .chip');

// Read the "Name · N pts" line of a duty card to learn who owns it.
async function ownerOf(page, taskId) {
  const text = await page.locator(`#tasks .card:has([data-t="${taskId}"]) .who`).innerText();
  return text.split('·')[0].trim();
}
async function assignments(page) {
  const out = {};
  for (const id of ['trash', 'recycle', 'bio', 'dish', 'floor', 'fridge', 'stove']) {
    out[id] = await ownerOf(page, id);
  }
  return out;
}
async function scoreOf(page, name) {
  const row = boardRows(page).filter({ hasText: name });
  const text = await row.locator('.pts').innerText();
  return parseInt(text, 10);
}

test.describe('start state', () => {
  test('shows 4 housemates, 7 duties and week 1', async ({ page }) => {
    await expect(crewChips(page)).toHaveCount(4);
    await expect(cards(page)).toHaveCount(7);
    await expect(page.locator('#week')).toContainText('Week 1');
    await expect(page.locator('#week')).toContainText('0 of 7 duties done');
  });

  test('every duty is owned by a real housemate and the load is spread out', async ({ page }) => {
    const names = ['Alex', 'Sam', 'Robin', 'Kim'];
    const a = await assignments(page);
    const counts = Object.fromEntries(names.map(n => [n, 0]));
    for (const owner of Object.values(a)) {
      expect(names).toContain(owner);
      counts[owner]++;
    }
    // 7 duties over 4 people: everyone gets 1 or 2
    for (const n of names) {
      expect(counts[n]).toBeGreaterThanOrEqual(1);
      expect(counts[n]).toBeLessThanOrEqual(2);
    }
  });

  test('shows a motivational message', async ({ page }) => {
    await expect(page.locator('#quote')).not.toBeEmpty();
  });
});

test.describe('completing duties and the scoreboard', () => {
  test('marking a duty done awards its points, undo takes them back', async ({ page }) => {
    const owner = await ownerOf(page, 'trash'); // worth 3 points
    expect(await scoreOf(page, owner)).toBe(0);

    await page.locator('[data-t="trash"]').click();
    await expect(page.locator('#tasks .card:has([data-t="trash"])')).toContainText('Done');
    await expect(page.locator('#week')).toContainText('1 of 7 duties done');
    expect(await scoreOf(page, owner)).toBe(3);
    await expect(page.locator('#quote')).toContainText(owner);

    await page.locator('[data-t="trash"]').click(); // undo
    await expect(page.locator('#week')).toContainText('0 of 7 duties done');
    expect(await scoreOf(page, owner)).toBe(0);
  });

  test('scoreboard is sorted by points', async ({ page }) => {
    const owner = await ownerOf(page, 'floor');
    await page.locator('[data-t="floor"]').click();
    await expect(boardRows(page).first()).toContainText(owner);
    await expect(boardRows(page).first()).toContainText('🥇');
  });

  test('finishing every duty shows the celebration', async ({ page }) => {
    for (const id of ['trash', 'recycle', 'bio', 'dish', 'floor', 'fridge', 'stove']) {
      await page.locator(`[data-t="${id}"]`).click();
    }
    await expect(page.locator('#week')).toContainText('7 of 7');
    await expect(page.locator('#quote')).toContainText('Spotless');
  });
});

test.describe('reroll', () => {
  test('rerolls straight away when everything is done', async ({ page }) => {
    for (const id of ['trash', 'recycle', 'bio', 'dish', 'floor', 'fridge', 'stove']) {
      await page.locator(`[data-t="${id}"]`).click();
    }
    await page.locator('#reroll').click();
    await expect(page.locator('#ask')).toBeHidden();
    await expect(page.locator('#week')).toContainText('Week 2');
    await expect(page.locator('#week')).toContainText('0 of 7 duties done');
  });

  test('asks first when duties are unfinished, and Cancel keeps the week', async ({ page }) => {
    await page.locator('#reroll').click();
    await expect(page.locator('#ask')).toBeVisible();
    await expect(page.locator('#asktxt')).toContainText('7 duties are not done yet');
    await page.locator('#askno').click();
    await expect(page.locator('#ask')).toBeHidden();
    await expect(page.locator('#week')).toContainText('Week 1');
  });

  test('confirming reroll moves to week 2 and shuffles duties', async ({ page }) => {
    const before = await assignments(page);
    await page.locator('#reroll').click();
    await page.locator('#askyes').click();
    await expect(page.locator('#week')).toContainText('Week 2');
    const after = await assignments(page);
    expect(after).not.toEqual(before);
    // at least a few duties changed hands
    const changed = Object.keys(before).filter(k => before[k] !== after[k]).length;
    expect(changed).toBeGreaterThanOrEqual(3);
  });

  test('scores are kept across weeks', async ({ page }) => {
    const owner = await ownerOf(page, 'trash');
    await page.locator('[data-t="trash"]').click();
    await page.locator('#reroll').click();
    await page.locator('#askyes').click();
    expect(await scoreOf(page, owner)).toBe(3);
  });
});

test.describe('duties', () => {
  test('the form has visible labels', async ({ page }) => {
    for (const label of ['Duty name', 'Icon', 'Points']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('adds a new duty with chosen icon and points', async ({ page }) => {
    await page.getByLabel('Duty name').fill('Wipe the table');
    await page.getByLabel('Icon').selectOption('🍽️');
    await page.getByLabel('Points').selectOption('4');
    await page.getByRole('button', { name: 'Add duty' }).click();

    await expect(cards(page)).toHaveCount(8);
    const card = cards(page).filter({ hasText: 'Wipe the table' });
    await expect(card).toContainText('🍽️');
    await expect(card).toContainText('4 pts');
    await expect(page.locator('#week')).toContainText('0 of 8 duties done');
    await expect(page.getByLabel('Duty name')).toHaveValue('');
  });

  test('a new duty goes to someone with the fewest duties', async ({ page }) => {
    await page.getByLabel('Duty name').fill('Wipe the table');
    await page.getByRole('button', { name: 'Add duty' }).click();
    const names = ['Alex', 'Sam', 'Robin', 'Kim'];
    const a = await assignments(page);
    const counts = Object.fromEntries(names.map(n => [n, 0]));
    Object.values(a).forEach(o => counts[o]++);
    const newOwner = (await cards(page).filter({ hasText: 'Wipe the table' }).locator('.who').innerText()).split('·')[0].trim();
    // before adding, owner had the minimum; after adding, they have min+1
    expect(counts[newOwner]).toBeLessThanOrEqual(2);
    expect(Math.min(...Object.values(counts))).toBeGreaterThanOrEqual(1);
  });

  test('an empty name is not accepted', async ({ page }) => {
    await page.getByRole('button', { name: 'Add duty' }).click();
    await expect(cards(page)).toHaveCount(7);
  });

  test('removing a duty asks first', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove duty Fridge check' }).click();
    await expect(page.locator('#asktxt')).toContainText('Fridge check');
    await page.locator('#askno').click();
    await expect(cards(page)).toHaveCount(7);

    await page.getByRole('button', { name: 'Remove duty Fridge check' }).click();
    await page.locator('#askyes').click();
    await expect(cards(page)).toHaveCount(6);
    await expect(page.locator('#tasks')).not.toContainText('Fridge check');
  });

  test('user text is escaped, not run as HTML', async ({ page }) => {
    await page.getByLabel('Duty name').fill('<b>bold</b><img src=x onerror=alert(1)>');
    await page.getByRole('button', { name: 'Add duty' }).click();
    await expect(page.locator('#tasks b')).toHaveCount(0);
    await expect(page.locator('#tasks img')).toHaveCount(0);
    await expect(page.locator('#tasks')).toContainText('<b>bold</b>');
  });
});

test.describe('housemates', () => {
  test('adds a housemate and shows them on the scoreboard', async ({ page }) => {
    await page.getByLabel('Housemate name').fill('Jamie');
    await page.getByRole('button', { name: 'Add housemate' }).click();
    await expect(crewChips(page)).toHaveCount(5);
    await expect(boardRows(page)).toHaveCount(5);
    await expect(boardRows(page).filter({ hasText: 'Jamie' })).toHaveCount(1);
  });

  test('removes a housemate after confirming and reassigns their duties', async ({ page }) => {
    await page.getByRole('button', { name: 'Remove Alex' }).click();
    await expect(page.locator('#asktxt')).toContainText('Alex');
    await page.locator('#askyes').click();
    await expect(crewChips(page)).toHaveCount(3);
    await expect(cards(page)).toHaveCount(7);
    await expect(page.locator('#tasks')).not.toContainText('Alex');
  });

  test('cannot go below 2 housemates', async ({ page }) => {
    for (const name of ['Alex', 'Sam']) {
      await page.getByRole('button', { name: `Remove ${name}` }).click();
      await page.locator('#askyes').click();
    }
    await expect(crewChips(page)).toHaveCount(2);
    await page.locator('#crew button').first().click();
    await expect(crewChips(page)).toHaveCount(2);
    await expect(page.locator('#quote')).toContainText('at least 2');
  });

  test('no more than 8 housemates', async ({ page }) => {
    for (const n of ['A1', 'A2', 'A3', 'A4', 'A5']) {
      await page.getByLabel('Housemate name').fill(n);
      await page.getByRole('button', { name: 'Add housemate' }).click();
    }
    await expect(crewChips(page)).toHaveCount(8);
  });

  test('each housemate gets an animal figure', async ({ page }) => {
    await expect(page.locator('#board svg')).toHaveCount(4);
    const svgs = await page.locator('#board svg').evaluateAll(els => els.map(e => e.innerHTML));
    expect(new Set(svgs).size).toBe(4); // all four look different
  });
});

test.describe('saving', () => {
  test('state survives a reload', async ({ page }) => {
    await page.getByLabel('Duty name').fill('Water plants');
    await page.getByRole('button', { name: 'Add duty' }).click();
    await page.locator('[data-t="trash"]').click();
    await page.reload();
    await expect(cards(page)).toHaveCount(8);
    await expect(page.locator('#tasks')).toContainText('Water plants');
    await expect(page.locator('#week')).toContainText('1 of 8 duties done');
  });

  test('Start over wipes everything after confirming', async ({ page }) => {
    await page.locator('[data-t="trash"]').click();
    await page.getByRole('button', { name: 'Start over' }).click();
    await page.locator('#askyes').click();
    await expect(page.locator('#week')).toContainText('0 of 7 duties done');
    await expect(page.locator('#week')).toContainText('Week 1');
  });

  test('keeps working when storage is full or blocked', async ({ page }) => {
    await page.addInitScript(() => {
      Storage.prototype.setItem = () => { throw new Error('quota'); };
    });
    await page.goto(URL);
    await page.locator('[data-t="trash"]').click();
    await expect(page.locator('#week')).toContainText('1 of 7 duties done');
  });
});

test.describe('dark / light mode', () => {
  test('toggle switches theme and remembers it', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(URL);
    const html = page.locator('html');
    const btn = page.locator('#theme');
    await expect(btn).toContainText('Dark mode');

    await btn.click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect(btn).toContainText('Light mode');
    await expect(btn).toHaveAttribute('aria-pressed', 'true');
    const bgDark = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.locator('#theme').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    const bgLight = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgLight).not.toBe(bgDark);
  });

  test('starts in dark when the device prefers dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(URL);
    await expect(page.locator('#theme')).toContainText('Light mode');
  });
});

test.describe('accessibility basics', () => {
  test('page has a language, a title and one h1', async ({ page }) => {
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page).toHaveTitle(/Kitchen Crew/);
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('every button and field has an accessible name', async ({ page }) => {
    const unnamed = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('button, input, select').forEach(el => {
        const name = (el.getAttribute('aria-label') || el.textContent || '').trim()
          || (el.labels && el.labels.length ? el.labels[0].textContent.trim() : '');
        if (!name) bad.push(el.outerHTML.slice(0, 80));
      });
      return bad;
    });
    expect(unnamed).toEqual([]);
  });

  test('the figures are decorative and hidden from screen readers', async ({ page }) => {
    const visible = await page.locator('#tasks svg:not([aria-hidden="true"])').count();
    expect(visible).toBe(0);
  });

  test('text has strong contrast in both modes', async ({ page }) => {
    const ratio = async () => page.evaluate(() => {
      const lum = c => {
        const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map(v => {
          v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const fg = lum(getComputedStyle(document.body).color);
      const bg = lum(getComputedStyle(document.body).backgroundColor);
      const [hi, lo] = fg > bg ? [fg, bg] : [bg, fg];
      return (hi + 0.05) / (lo + 0.05);
    });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(URL);
    expect(await ratio()).toBeGreaterThan(7); // WCAG AAA
    await page.locator('#theme').click();
    expect(await ratio()).toBeGreaterThan(7);
  });

  test('can be used with the keyboard only', async ({ page }) => {
    await page.locator('#reroll').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#ask')).toBeVisible();
    await expect(page.locator('#askyes')).toBeFocused(); // focus moves into the confirm bar
    await page.keyboard.press('Enter');
    await expect(page.locator('#week')).toContainText('Week 2');
  });
});
