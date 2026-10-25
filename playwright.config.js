// Runs the tests against the plain files (index.html) in a real browser.
module.exports = {
  testDir: './tests',
  timeout: 15000,
  fullyParallel: true,
  reporter: [['list']],
  use: { browserName: 'chromium' }
};
