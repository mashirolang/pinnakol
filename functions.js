const puppeteer = require("puppeteer");
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs").promises;

const getToken = async (username, password) => {
  const json = await fs.readFile("token.json", "utf8");
  const token = JSON.parse(json).token;

  if (!checkToken(token)) {
    const browser = await puppeteer.launch();
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
  return items
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

  const quizzes = $("#nav-quiz a")
    .map((index, element) => {
      const $element = $(element);
      return {
        title: $element.find("h5").text().trim(),
        due: $element.find("h6").text().trim(),
        posted: $element.find("small").text().trim(),
      };
    })
    .get();

  const onlineClass = $("#nav-ocs a")
    .map((index, element) => {
      const $element = $(element);
      return {
        title: $element.find("h5").text().trim(),
        due: $element.find("h6").text().trim(),
        posted: $element.find("small").text().trim(),
      };
    })
    .get();

  const posts = $("#nav-wall a")
    .map((index, element) => {
      const $element = $(element);
      return {
        title: $element.find("h5").text().trim(),
        type: $element.find("span").text().trim(),
        posted: $element.find("small").text().trim(),
      };
    })
    .get();

  console.log(assignments, quizzes, onlineClass, posts);
  return { assignments, quizzes, onlineClass, posts }
};

const getClassLibraries = async (token, code) => {
  const CSRFToken = await getCSRFToken(token) // Found in meta element
  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
    Cookie: `XSRF-TOKEN=${token[0]}; pinnacle_session=${token[1]}`,
  };

  const postData = { 
    _token: CSRFToken,
    key: code
  }

  const url = `https://pinnacle.pnc.edu.ph/student/library/class`
  const data = await axios({
    method: "post",
    url: url,
    data: postData,
    headers: headers
  })
  .then((res) => res.data)
  .catch(err => console.log(err))
  
  const $ = cheerio.load(data)

  const documents = $("#nav-docs a")
  .map((index, element) => {
    const $element = $(element)
    return {
      title: $element.text().trim(),
      href: $element.attr("href")
    }
  })
  .get()
  
  const images = $("#nav-images a")
  .map((index, element) => {
    const $element = $(element)
    return {
      href: $element.attr("href")
    }
  })
  .get()

  const videos = $("#nav-videos > div")
  .map((index, element) => {
    const $element = $(element)
    return {
      title: $element.find('h6').text().trim(),
      href: $element.find('iframe').attr('src') || $element.find('iframe').attr('href')
    }
  })
  .get()
    
  return { documents, images, videos }
}

const getCSRFToken = async (token) => {
  const json = await fs.readFile('token.json', 'utf-8')
  let csrfToken = JSON.parse(json).csrfToken

  if(csrfToken) return csrfToken

  const headers = {
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "max-age=0",
    Cookie: `XSRF-TOKEN=${token[0]}; pinnacle_session=${token[1]}`,
  };

  const url = `https://pinnacle.pnc.edu.ph/student/library`;

  const data = await axios(url, {
    headers,
  }).then((res) => res.data)

  const $ = cheerio.load(data)

  const metaToken = $('meta[name="csrf-token"]').attr('content')

  await fs.writeFile(
    "token.json",
    JSON.stringify(
      { token: token , csrfToken: metaToken },
      null,
      2
    ),
    "utf8"
  );

  return metaToken
}

module.exports = {
getToken,
getClassLists,
getClassDetails,
getClassLibraries
}

