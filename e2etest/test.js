import webdriver, { logging, LogInspector } from "selenium-webdriver";
import { executeTestSuite, HEADLESS } from "./tests/test-suites.js";
import Firefox from "selenium-webdriver/firefox.js";
import { DOWNLOAD_DIRECTORY } from "./helpers.js";
import { BaseLogEntry } from "selenium-webdriver/bidi/logEntries.js";

async function main() {
    // Make sure tests fail in HEADLESS mode before thinking they're really failing, or just remove your mouse from focus of the selenium window

    const prefs = new logging.Preferences()
    prefs.setLevel(logging.Type.BROWSER, logging.Level.ALL);

    /** @type {BaseLogEntry[]} */
    const logs = [];
    let driver;
    try {
        const DOWNLOAD_TO_DIRECTORY = 2;
        driver = new webdriver.Builder()
            .forBrowser(webdriver.Browser.FIREFOX)
            .setLoggingPrefs(prefs)
            .setFirefoxOptions(new Firefox.Options()
                .setPreference("browser.download.folderList", DOWNLOAD_TO_DIRECTORY)
                .setPreference("browser.download.dir", DOWNLOAD_DIRECTORY)
                .setPreference("devtools.console.stdout.content", true)
                .addArguments(HEADLESS ? "--headless=new" : "")
                .addArguments("--width=1920")
                .addArguments("--height=1080")
            )
            .withCapabilities(new webdriver.Capabilities().set("webSocketUrl", true))
            .build();
        //await driver.manage().window().setRect({width: 1920, height: 1080});
        const logInspector = await LogInspector(driver);
        logInspector.onLog(e => {
            logs.push(e);
        });
        //await driver.manage().window().setRect({width: 1920, height: 1080, x: 0, y: 0});
        await executeTestSuite(driver, logs);
        // process.exit(0);
    } catch (e) {
        throw e;
    }
    finally {
        if (HEADLESS) {
            await driver.close();
        }
    }
    
}

main();