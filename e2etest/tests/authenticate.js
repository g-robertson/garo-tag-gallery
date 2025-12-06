import {By} from "selenium-webdriver";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 * @param {number} port
 * @param {string} accessKey
 */
export async function authenticate(driver, port, accessKey) {
    await driver.get(`http://localhost:${port}`);
    await driver.findElement(By.name("accessKey")).sendKeys(accessKey);
    await driver.findElement(By.css("[type=submit]")).click();

    const root = await driver.findElements(By.id("root"));
    if (root.length === 0) {
        throw "Could not authenticate to application";
    }
}