import { expect } from "@playwright/test";

import { test } from "./lib/fixtures";
import {
  bookTimeSlot,
  selectFirstAvailableTimeSlotNextMonth,
  submitAndWaitForResponse,
} from "./lib/testUtils";

test.describe.configure({ mode: "parallel" });

// TODO: This test is very flaky. Feels like tossing a coin and hope that it won't fail. Needs to be revisited.
test.describe("hash my url", () => {
  test.beforeEach(async ({ users }) => {
    const user = await users.create();
    await user.apiLogin();
  });
  test.afterEach(async ({ users }) => {
    await users.deleteAll();
  });
  test("generate url hash", async ({ page }) => {
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator(".primary-navigation >> text=Advanced").click();
    // ignore if it is already checked, and click if unchecked
    const hashedLinkCheck = await page.locator('[data-testid="multiplePrivateLinksCheck"]');

    await hashedLinkCheck.click();

    // we wait for the hashedLink setting to load
    const $url = await page.locator('//*[@data-testid="generated-hash-url-0"]').inputValue();

    // click update
    await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    // book using generated url hash
    await page.goto($url);
    await selectFirstAvailableTimeSlotNextMonth(page);
    await bookTimeSlot(page);
    // Make sure we're navigated to the success page
    await expect(page.locator("[data-testid=success-page]")).toBeVisible();

    // hash regenerates after successful booking
    await page.goto("/event-types");
    // We wait until loading is finished
    await page.waitForSelector('[data-testid="event-types"]');
    await page.locator("ul[data-testid=event-types] > li a").first().click();
    // We wait for the page to load
    await page.locator(".primary-navigation >> text=Advanced").click();

    const hashedLinkCheck2 = await page.locator('[data-testid="multiplePrivateLinksCheck"]');
    await hashedLinkCheck2.click();

    // we wait for the hashedLink setting to load
    const $newUrl = await page.locator('//*[@data-testid="generated-hash-url-0"]').inputValue();
    expect($url !== $newUrl).toBeTruthy();

    // Ensure that private URL is enabled after modifying the event type.
    // Additionally, if the slug is changed, ensure that the private URL is updated accordingly.
    await page.getByTestId("vertical-tab-event_setup_tab_title").click();
    await page.locator("[data-testid=event-title]").first().fill("somethingrandom");
    await page.locator("[data-testid=event-slug]").first().fill("somethingrandom");
    await submitAndWaitForResponse(page, "/api/trpc/eventTypes/update?batch=1", {
      action: () => page.locator("[data-testid=update-eventtype]").click(),
    });
    await page.locator(".primary-navigation >> text=Advanced").click();
    const $url2 = await page.locator('//*[@data-testid="generated-hash-url-0"]').inputValue();
    expect($url2.includes("somethingrandom")).toBeTruthy();
  });
});
