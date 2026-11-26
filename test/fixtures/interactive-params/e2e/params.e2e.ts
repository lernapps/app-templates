// The parameters of the address in the browser: the runtime gives them to the core whole, keeps them when a new
// route starts the core again, and writes them nowhere: not into the address, the storage or the console.
import { expect, test } from "playwright/test";

const CHALLENGE =
  "IqbXAZCn8Irm9vJH9B91bmAHmTd6iFz2DyfQlvgwn7HAYA_S4RTWigZn00d_BoCjNomvYpoRXPrelQMlvlsnaBO5-ucBEHD87LWx0lcdUuoLOW2rAbfeCgKuaZwZ2U5fzul52Ud_elkUIUnGVZm0n0YWDy9jk49EvvRW2wcH08A0SlkqijP3-DdzloMN-3MHmalw0BEAYIeYXzfE3qC4nL4deMwUHuStAyA22BlNS3wC57055Gh-LAbwoHqVsvjiooDFzJDjOx3nTXfI6imDnQnNt1FFvVS-UNV7S1EpuPFMIkw2Wv4Y7XkgpHH3UMyZ2RGLCmm6SJSkFhBLDCb7xc886zB-AT92rb6mJiPoyH6S_ZcQ3Dg4CQRta5d2Xv0UD9scuipNpdCISyiSfvz_8jhPXPeL8BGHdTBPcwNbXKnYdfm8bjFCwtTG54pASN8vFgl3y1kXdL1Du0gcec2LGJb98xTgWETPj1tEYU_BJKf4_q-AyNMZlukoajfH05HwQNK8kJjiGPyluA_TaugmcfCHW3gCghdnWdQMsuswPrDAGqLmg8cf2U08bgTw38p5FTf9iVLD9fe0ZLNuWhkaCxVh-OI-f6-MsIWdKPQAknsKo8BYDda0YqzBZR7Bs6zbaGUYKX4KJ5LgEAvQWHyDS5WWhckQ8wLuBruwxEEDCEeFN5V31hxOa3_wGquryMdgHJYcIdlhzruqptLiKRBiK6OxurUORLFuSFsrB5-dGLybUt50AfE_ZdZlG-FBAAQ-kyqLEN8MYzDrIUnbm8Eja54-8dvBHHbrmYrA5Z64bH2JmIcXxSpi1JRvzjFKHLnhGG0tbiy6FYnous_3Br84n38z_oMfwOA2K5uGJaEk1mkuVzzW1BODLdvIGWCt3SaeR4uiKcbkp1twrzo4MdTqmnR_9ngYPE0o4TvuhOhDHVNHTXNh5EgQFR95hSXG9oFvVanv63_xQda8q5CTAK_SsiXfM3RjNSOaiTwj5dDTRmt01X69jAYzvFLISTNvuXk-Vj-M5ekLwn7--lp05Q2eX4xa9Up-B-_xQxjwvWpUhdvc9gDfT-qD-9Eix51v_JPsGsfV8xNuVJtq_MwAbYGL2_iaunjQKYfmPjFSgGg2tO2eNQgjBTbTjhFAkIYBv_h-VHSf3j-VzyYegpJto4H8Jf-LJIiPJt4m_2DT4PqqtONlp0Q7_9o-qvVYkQk4BYDjbaJ6Hwg7a2iSUsIWiYL-R6QA04f29scUomVzeD6mDWw9J73aGvvErbdD-v4L999fb1q6ctNKv4y0MIkrnt7HyHlYOYuqaDu-l2St5fjJaJMZDHBtxzo187J0u3lZbhc5yv00zs1AjG_0eqheM_8yfvjrAd4yOffAJKz-Oy6lxssiwgHl0Yo-aDu8culjLTmPD9W32KokRwGQBtQ7OaSptO8b_mo9pDgx7whpSseUVA80uFJjdSRx9iFGMNbHU4tG9ZBIY6JOVVPIewlR08bOzU40b75Z6v3DhSfOG1XOISTRmSKR5B6mG8xlaANdE4osBoTX3wZ2mOo8MiRxf1j2lxMv5bXj9iJSD2Qpa-wCjdGgJW-xVGcNX2C7nNnbOvCrXltjnUajGYIE2Vf8Cm-ixaPsh7WBOECcbe6XUdLcZzFGXVT9jkP-FU3zz7jl1SMnel55ewPyh2ycZnoFcsWdcQrJh6JoXcBxCb8zXSo1IGto4gf4zHdEx8T1OOjw8i-D_TyNWGOtpxNutW4UsjsUuqHjDwTJHU4J8sZa9SOchAUzlQ0_BzPbihdtDSXK3SuGiboW5MoCe1X5KDS0gEvu6hLjWOFO0Paxuz_wpKXwDP6IIH6m5sk7refxLuVz5lwlRIckv2wQvzQ-Hau2BPnPlOSKAH0Yu0TFE0FBx3fuLgDrbvZQIkgiZJGwOpRpLkoXpSNjuJKZ0XGZmn3-OqulybdK50cAa-9QReZf9Ffhq6z01X909JnE5-McFhoTdZxaelUILNHDBa52XApQ";

const stateOf = (host: Element) => (host as unknown as { lernappsState: Record<string, unknown> }).lernappsState;

test("a new route keeps the parameters of the address, which the runtime writes nowhere", async ({ page }) => {
  const logged: string[] = [];
  page.on("console", (entry) => logged.push(entry.text()));
  const address = `./app/?c=${CHALLENGE}&seed=7&level=2&level=3#grundreihe`;
  await page.goto(address);
  const host = page.locator(".interactive-app");
  await expect(host).toHaveAttribute("data-mounted", "");
  // all but the seed, the first value of a name given twice
  const params = { c: CHALLENGE, level: "2" };
  expect(await host.evaluate(stateOf)).toMatchObject({ seed: 7, route: "grundreihe", challenge: CHALLENGE, params });
  await page.evaluate(() => (location.hash = "obere-reihe"));
  await expect.poll(async () => (await host.evaluate(stateOf))["route"]).toBe("obere-reihe");
  expect(await host.evaluate(stateOf)).toMatchObject({ seed: 7, challenge: CHALLENGE, params });
  expect(page.url()).toContain(`?c=${CHALLENGE}&seed=7&level=2&level=3#obere-reihe`);
  const stored = await page.evaluate(() =>
    JSON.stringify([...Object.entries(localStorage), ...Object.entries(sessionStorage)]),
  );
  expect(stored).not.toContain(CHALLENGE.slice(0, 40));
  expect(logged.join("\n")).not.toContain(CHALLENGE.slice(0, 40));
});
