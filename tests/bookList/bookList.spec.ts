import type { IBook } from "../../type";
import { test, Page } from "@playwright/test";
import { ExcelService } from "../../excel";

test.describe("bookList", async () => {
  let books: Array<IBook> = [];
  test("get book information", async ({ page }) => {
    const tagName = "算法";
    await page.goto(`https://book.douban.com/tag/${tagName}?start=0&type=T`);
    page.once("load", () => console.log("Page loaded!"));

    for (
      let nextButton = page.locator("text=后页>");
      ;
      await nextButton.click()
    ) {
      await page
        .locator('//*[@id="db-nav-book"]/div[1]/div/div[1]/a')
        .waitFor();
      books = books.concat(await getBooks(page));
      nextButton = page.locator("text=后页>");
      if (
        (await nextButton.count()) <= 0 ||
        (await nextButton.getAttribute("href")) === null
      ) {
        break;
      }
    }

    new ExcelService().exportAsExcelFile(books, `${tagName}图书数据`);
  });
});

export async function getBooks(page: Page): Promise<IBook[]> {
  let books: Array<IBook> = [];
  const bookLists = page.locator('//*[@id="subject_list"]/ul/li');
  const count = await bookLists.count();
  console.log(`count: ${count}`);

  for (let i = 0; i < count; i++) {
    const bookTitle = bookLists.nth(i).locator("div.info > h2 > a");
    const bookId = ((await bookTitle.getAttribute("onclick")) as string).split(
      "'"
    )[5];
    const bookName = await bookTitle.innerText();
    const bookUrl = `https://book.douban.com/subject/${bookId}/`;
    const bookImg = await bookLists
      .nth(i)
      .locator("div.pic > a > img")
      .getAttribute("src");
    const bookPub = (
      await bookLists.nth(i).locator("div.info > div.pub").innerText()
    ).split("/");

    let bookAuthor: string,
      bookTranslator: string,
      bookPublisher: string,
      bookPubDate: string,
      bookPrice: string;

    switch (bookPub.length) {
      case 4:
        bookAuthor = bookPub[0];
        bookTranslator = "";
        bookPublisher = bookPub[1];
        bookPubDate = bookPub[2];
        bookPrice = bookPub[3];
        break;
      case 5:
        bookAuthor = bookPub[0];
        bookTranslator = bookPub[1];
        bookPublisher = bookPub[2];
        bookPubDate = bookPub[3];
        bookPrice = bookPub[4];
        break;
      default:
        continue;
      //屏蔽信息不全的书籍
    }
    // check if the rating_nums is exist
    let bookRating = "null";
    let bookRatingPeople = "null";
    if (
      (await bookLists
        .nth(i)
        .locator("div.info > div.star > span.rating_nums")
        .count()) > 0
    ) {
      bookRating = await bookLists
        .nth(i)
        .locator("div.info > div.star > span.rating_nums")
        .innerText();
      bookRatingPeople = (
        await bookLists
          .nth(i)
          .locator("div.info > div.star > span.pl")
          .innerText()
      ).replace(/[^\d]/g, "");
    } else {
      continue;
      //屏蔽信息不全的书籍
    }

    // check if the p element of dic.info is exist
    let bookIntro = "";
    if ((await bookLists.nth(i).locator("div.info > p").count()) > 0) {
      bookIntro = await bookLists.nth(i).locator("div.info > p").innerText();
    }

    const book: IBook = {
      bookId,
      bookName,
      bookUrl,
      bookImg,
      bookAuthor,
      bookTranslator,
      bookPublisher,
      bookPrice,
      bookPubDate,
      bookRating,
      bookRatingPeople,
      bookIntro,
    };
    // console.log(bookName);
    books.push(book);
  }
  return books;
}
