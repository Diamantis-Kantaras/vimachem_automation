import { test, expect, type Page } from '@playwright/test';

// Creates unique test data so each run can sign up a new user.
function uniqueId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

function createUser() {
  const id = uniqueId();

  return {
    firstName: 'Playwright',
    lastName: `User${id}`,
    email: `playwright.${id}@example.test`,
    password: 'Playwright123!'
  };
}

function createContact() {
  return {
    firstName: 'Diamantis',
    lastName: 'Kantaras',
    birthdate: '1815-12-10',
    email: 'diamantis.kantaras@example.test',
    phone: '5551234567',
    street1: '1 Thessaloniki Unknown Way',
    city: 'Thessaloniki',
    stateProvince: 'Central Macedonia',
    postalCode: '56 532',
    country: 'Greece'
  };
}

// Signs up a new user through the UI.
async function signUp(page: Page, user: ReturnType<typeof createUser>) {
  await page.goto('https://thinking-tester-contact-list.herokuapp.com/');

  // Click Sign Up and wait until the Add User page opens.
  await Promise.all([
    page.waitForURL('**/addUser'),
    page.locator('#signup').click()
  ]);

  // Fill the Sign Up form using stable IDs.
  await page.locator('#firstName').fill(user.firstName);
  await page.locator('#lastName').fill(user.lastName);
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill(user.password);

  // Submit and wait until the Contact List page opens.
  await Promise.all([
    page.waitForURL('**/contactList'),
    page.locator('#submit').click()
  ]);
}

// Adds a valid contact through the UI.
async function addContact(page: Page, contact: ReturnType<typeof createContact>) {
  await Promise.all([
    page.waitForURL('**/addContact'),
    page.locator('#add-contact').click()
  ]);

  await page.locator('#firstName').fill(contact.firstName);
  await page.locator('#lastName').fill(contact.lastName);
  await page.locator('#birthdate').fill(contact.birthdate);
  await page.locator('#email').fill(contact.email);
  await page.locator('#phone').fill(contact.phone);
  await page.locator('#street1').fill(contact.street1);
  await page.locator('#city').fill(contact.city);
  await page.locator('#stateProvince').fill(contact.stateProvince);
  await page.locator('#postalCode').fill(contact.postalCode);
  await page.locator('#country').fill(contact.country);

  // Save the contact and wait until the Contact List page opens again.
  await Promise.all([
    page.waitForURL('**/contactList'),
    page.locator('#submit').click()
  ]);
}

// Opens the contact details page for the selected contact.
async function openContactDetails(
  page: Page,
  contact: ReturnType<typeof createContact>
) {
  const contactRow = page
    .locator('.contactTableBodyRow')
    .filter({ hasText: `${contact.firstName} ${contact.lastName}` });

  await expect(contactRow).toHaveCount(1);

  // The second cell contains the clickable first name.
  await Promise.all([
    page.waitForURL('**/contactDetails'),
    contactRow.locator('td').nth(1).click()
  ]);
}

test('Sign up, add a contact, and validate its details', async ({ page }) => {
  const user = createUser();
  const contact = createContact();

  await signUp(page, user);
  await addContact(page, contact);
  await openContactDetails(page, contact);

  // Validate the values displayed on the contact details page.
  await expect(page.locator('#firstName')).toHaveText(contact.firstName);
  await expect(page.locator('#lastName')).toHaveText(contact.lastName);
  await expect(page.locator('#birthdate')).toHaveText(contact.birthdate);
  await expect(page.locator('#email')).toHaveText(contact.email);
  await expect(page.locator('#phone')).toHaveText(contact.phone);
  await expect(page.locator('#street1')).toHaveText(contact.street1);
  await expect(page.locator('#city')).toHaveText(contact.city);
  await expect(page.locator('#stateProvince')).toHaveText(
    contact.stateProvince
  );
  await expect(page.locator('#postalCode')).toHaveText(contact.postalCode);
  await expect(page.locator('#country')).toHaveText(contact.country);
});

test('Show an error for an invalid date of birth', async ({ page }) => {
  const user = createUser();

  await signUp(page, user);

  await Promise.all([
    page.waitForURL('**/addContact'),
    page.locator('#add-contact').click()
  ]);

  // Enter an invalid date of birth.
  await page.locator('#firstName').fill('Invalid');
  await page.locator('#lastName').fill('Birthdate');
  await page.locator('#birthdate').fill('not-a-valid-date');

  await page.locator('#submit').click();

// Find the error message shown by the application.
const errorMessage = page.locator('#error');

// Verify the expected validation message first.
await expect(errorMessage).toHaveText(
  /Contact validation failed:\s*birthdate:\s*Birthdate is invalid\.?/i
);

// Print the successfully validated message in the VS Code terminal.
const actualError = await errorMessage.innerText();

console.log(`Validation message displayed: ${actualError}`);
});

test('Delete an existing contact', async ({ page }) => {
  const user = createUser();
  const contact = createContact();

  await signUp(page, user);
  await addContact(page, contact);
  await openContactDetails(page, contact);

  // Accept the confirmation dialog that appears after clicking Delete Contact.
  page.once('dialog', dialog => dialog.accept());

  await page.locator('#delete').click();

  // Confirm that the application returns to the contact list.
  await expect(page).toHaveURL(/contactList/);

  // Confirm that the deleted contact is no longer displayed.
  await expect(
    page
      .locator('.contactTableBodyRow')
      .filter({ hasText: `${contact.firstName} ${contact.lastName}` })
  ).toHaveCount(0);
});