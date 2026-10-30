// Exercise the same required confirmation as a returning player with a saved name.
export async function confirmName(page) {
  await page.locator('#name-dialog').waitFor({state:'visible'});
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.locator('#name-dialog').waitFor({state:'hidden'});
}
