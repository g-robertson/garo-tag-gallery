import {By} from "selenium-webdriver";

/** @import {ThenableWebDriver} from "selenium-webdriver" */

/**
 * @param {ThenableWebDriver} driver 
 * @param {number} port
 * @param {string} accessKey
 */
export async function authenticate(driver, port, accessKey) {
    await driver.get(`http://localhost:${port}`);
    const name = await driver.findElement(By.name("accessKey"));
    await name.sendKeys(accessKey);
    const submit = await driver.findElement(By.css("[type=submit]"));
    await submit.click();

    const root = await driver.findElements(By.id("root"));
    if (root.length === 0) {
        throw "Could not authenticate to application";
    }
}