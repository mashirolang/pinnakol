const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;

const getToken = async (username, password) => {
  const json = await fs.readFile("token.json", "utf8");
  const token = JSON.parse(json).token;

  if (!checkToken(token)) {
    const browser = await puppeteer.launch({ headless: false });
    try {
      const page = await browser.newPage();

      // Go to the login page
      await page.goto("https://pinnacle.pnc.edu.ph/student/login");

      await page.evaluate(() => {
        const usernameDoc = document.querySelector(
          "body > div.auth-wrapper > div > div > div.col-xl-4.col-lg-6.col-md-7.p-0.my-auto.d-md-block.d-none > div > form > div:nth-child(2) > input"
        );

        const passwordDoc = document.querySelector(
          "body > div.auth-wrapper > div > div > div.col-xl-4.col-lg-6.col-md-7.p-0.my-auto.d-md-block.d-none > div > form > div:nth-child(3) > input"
        );

        const buttonDoc = document.querySelector(
          "body > div.auth-wrapper > div > div > div.col-xl-4.col-lg-6.col-md-7.p-0.my-auto.d-md-block.d-none > div > form > div.sign-btn.text-center > button"
        );

        usernameDoc.value = username;
        passwordDoc.value = password;

        buttonDoc.click();
      });

      await page.waitForNavigation();

      const cookies = await page.cookies();

      const pinnacle_session = cookies.find(
        (cookie) => cookie.name === "pinnacle_session"
      );

      const xsrf = cookies.find((cookie) => cookie.name === "XSRF-TOKEN");

      await browser.close();

      await fs.writeFile(
        "token.json",
        JSON.stringify(
          { token: [xsrf.value, pinnacle_session.value] },
          null,
          2
        ),
        "utf8"
      );

      return [xsrf.value, pinnacle_session.value];
    } catch (err) {
      await browser.close();

      return null;
    }
  } else {
    return token;
  }
};

const getClassLists = async (token) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    Cookie: `XSRF-TOKEN=${token[0]}; pinnacle_session=${token[1]}`,
  };

  const data = await axios("https://pinnacle.pnc.edu.ph/student", {
    headers,
  }).then((res) => res.data);

  const $ = cheerio.load(data);

  const items = $(".submenu-content a")
    .map((index, element) => {
      const $element = $(element);
      const href = $element.attr("href");
      const code = href.match(/\/(\d+)(?!.*\/)/)?.[1];
      const name = $element
        .find("b")
        .text()
        .match(/:\s*(\w+)/)?.[1];

      return {
        code,
        name,
      };
    })
    .get();

  console.log(items);
};

const checkToken = async (token) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    Cookie: `XSRF-TOKEN=${token[0]}; pinnacle_session=${token[1]}`,
  };

  const data = await axios("https://pinnacle.pnc.edu.ph/student", {
    headers,
  }).then((res) => res.data);

  const $ = cheerio.load(data);

  const text = $(
    "body > div.wrapper > header > div > div > div:nth-child(1) > h6 > b"
  ).text();

  if (text) {
    return true;
  } else {
    return false;
  }
};

const getClassDetails = async (token, code) => {
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "max-age=0",
    Cookie: `XSRF-TOKEN=${token[0]}; pinnacle_session=${token[1]}`,
  };

  const url = `https://pinnacle.pnc.edu.ph/student/class/${code}`;

  const data = await axios(url, {
    headers,
  }).then((res) => res.data);

  const $ = cheerio.load(data);

  const assignments = $("#nav-ass a")
    .map((index, element) => {
      const $element = $(element);
      return {
        title: $element.find("h5").text().trim(),
        due: $element.find("h6").text().trim(),
        posted: $element.find("small").text().trim(),
      };
    })
    .get();

  console.log(assignments);
};
