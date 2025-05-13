import { chromium, type Page } from "playwright-core";
import chromiumBinary from "@sparticuz/chromium";

export interface Catalog {
  title: string;
  imgUrl: string;
  totalItems: string;
  url: string;
  slug: string;
}

export interface Product {
  name: string;
  price: string;
  imgUrl: string;
  url: string;
}

export async function infiniteScroll(page: Page, itemSelector: string) {
  const SCROLL_DELAY = 2000;
  const MAX_SCROLL = 20;

  let previousItemCount = 0;
  let scrollCount = 0;

  while (scrollCount < MAX_SCROLL) {
    const items = await page.$$(itemSelector);
    const currentTotalItems = items.length;

    if (currentTotalItems === previousItemCount && scrollCount > 0) {
      break;
    }

    if (currentTotalItems > previousItemCount) {
      previousItemCount = currentTotalItems;
    }
    await page.evaluate(() => {
      // smooth scroll
      const height = document.body.scrollHeight;
      window.scrollTo({
        top: height - height * 0.1,
        behavior: "smooth",
      });
    });

    await page.waitForTimeout(SCROLL_DELAY);
    scrollCount++;
  }
}

export async function getCatalogs() {
  const executablePath = await chromiumBinary.executablePath();
  const browser = await chromium.launch({
    args: chromiumBinary.args,
    executablePath,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();
  await page.goto("https://quicksell.co/w/angymalu/y3a");

  await page.waitForSelector(".catalogue-list", { state: "visible" });
  await infiniteScroll(page, ".catalogue-list a");
  const catalogList = await page.$$(".catalogue-list a");
  const catalogs: Catalog[] = [];

  for (const catalog of catalogList) {
    const $title = await catalog.$(".catalogue-title-grid");
    const $productCount = await catalog.$(".product-count");
    const $img = await catalog.$("img");
    const title = (await $title?.textContent()) ?? "";
    const imgUrl = (await $img?.getAttribute("src")) ?? "";
    const totalItems = (await $productCount?.textContent()) ?? "";
    const url = (await catalog.getAttribute("href")) ?? "";
    const slug = url.split("/")[3] ?? "";

    catalogs.push({
      title,
      imgUrl,
      totalItems,
      url,
      slug,
    });
  }

  await browser.close();

  return catalogs;
}

export async function getProducts(slug: string, id: string) {
  const executablePath = await chromiumBinary.executablePath();
  const browser = await chromium.launch({
    args: chromiumBinary.args,
    executablePath,
    headless: true,
  });
  const context = await browser.newContext({
    viewport: null,
  });
  const page = await context.newPage();
  await page.goto(`https://quicksell.co/s/angymalu/${slug}/${id}`);

  await page.waitForSelector("div[data-test-id='virtuoso-item-list']", {
    state: "visible",
  });
  await infiniteScroll(page, "div[data-test-id='virtuoso-item-list'] > div");
  const $products = await page.$$(
    "div[data-test-id='virtuoso-item-list'] a[itemtype='https://schema.org/Product']"
  );

  const products: Product[] = [];

  for (const product of $products) {
    const name = (await product.getAttribute("title")) ?? "";
    const $price = await product.$(".price");
    const price = (await $price?.textContent()) ?? "";
    const $img = await product.$('link[itemprop="image"]');
    const imgUrl = (await $img?.getAttribute("href")) ?? "";
    const url = (await product.getAttribute("href")) ?? "";

    products.push({ name, price, imgUrl, url });
  }

  await browser.close();

  return products;
}
