const puppeteer = require("puppeteer");
const xlsx = require("xlsx");
const path = require("path");

const exportExcel = (data, workSheetColumnNames, workSheetName, filePath) => {
  const workBook = xlsx.utils.book_new();
  const workSheetData = [workSheetColumnNames, ...data];
  const workSheet = xlsx.utils.aoa_to_sheet(workSheetData);
  xlsx.utils.book_append_sheet(workBook, workSheet, workSheetName);
  xlsx.writeFile(workBook, path.resolve(filePath));
};

const YellowPages = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: [`--window-size=1440,800`],
    defaultViewport: {
      width: 1440,
      height: 800,
    },
  });

  const page = await browser.newPage();

  await page.goto("https://www.yellowpages.ca/", {
    waitUntil: "load",
    timeout: 0,
  });

  //entering the values in the text fields

  const Search = "Plumber";
  const Location = "Australia";

  await page.waitForSelector("input[name=what]");
  await page.$eval("input[name=what]", (el) => (el.value = "Plumber"));
  await page.waitForSelector("input[name=where]");
  await page.$eval("input[name=where]", (el) => (el.value = "Australia"));
  await page.evaluate(() => {
    let button = document.getElementsByClassName(
      "search-form__button jsBtnSearchForm "
    );
    button.search_button.click();
  });

  await page.waitForNavigation({
    waitUntil: "load",
    timeout: 0,
  });

  let nextButton = "Next >>";

  let allData = [];
  let numbers = [];

  do {
    for (let i = 1; i <= 100; i++) {
      let obj = [];
      obj[0] = allData.length + 1;
      const [element] = await page.$x(
        `/html/body/div[2]/div[2]/div/div[1]/div[7]/div[1]/div[${i}]/div/div/div/div[2]/div[1]/div[1]/div[1]/h3/a`
      );

      const name = await page.evaluate((name) => {
        if (name?.innerText !== undefined) {
          return name.innerText;
        } else {
          return undefined;
        }
      }, element);
      if (name === undefined) {
        break;
      }

      obj[1] = name;

      const [element2] = await page.$x(
        `/html/body/div[2]/div[2]/div/div[1]/div[7]/div[1]/div[${i}]/div/div/div/div[2]/div[1]/div[1]/div[2]/span`
      );

      const address = await page.evaluate((name) => {
        if (name?.innerText !== undefined) {
          return name.innerText;
        } else {
          return undefined;
        }
      }, element2);
      obj[2] = address ? address : "";

      allData.push(obj);
    }

    let numbersList = await page.evaluate(async () => {
      let list1 = [];
      const dropDown = document.getElementsByClassName(
        "mlr__item__cta jsMlrMenu"
      );

      for (let i = 0; i < dropDown.length; i++) {
        dropDown[i].click();
        const list = document.getElementsByClassName("mlr__submenu");
        list1.push(list[i].innerText);
      }
      return list1;
    });

    numbers = [...numbers, ...numbersList];

    const bn = await page.evaluate(() => {
      const button = document.getElementsByClassName(
        "ypbtn btn-theme pageButton"
      );
      if (button.length === 2) {
        if (!button[1]?.innerText.includes("Next")) {
          return "close";
        }
      } else {
        if (!button[0]?.innerText.includes("Next")) {
          return "close";
        }
      }

      return button.length === 2 ? button[1]?.innerText : button[0]?.innerText;
    });

    nextButton = bn;
    if (nextButton.includes("Next")) {
      await page.evaluate(() => {
        const button = document.getElementsByClassName(
          "ypbtn btn-theme pageButton"
        );

        button.length === 2
          ? button[1].click()
          : button[0].innerText.includes("Next")
          ? button[0].click()
          : null;
        return;
      });

      await page.waitForNavigation({ waitUntil: "load", timeout: 0 });
    }
  } while (nextButton.includes("Next"));

  const newData = allData.map((item, index) => {
    return [...item, numbers[index] ? numbers[index] : ""];
  });

  allData = newData;

  exportExcel(
    allData,
    ["ID", "Company Name", "Address", "Numbers"],
    `${Search} in ${Location}`,
    `./${Search}_in_${Location}.xlsx`
  );

  await browser.close();
};

YellowPages();
