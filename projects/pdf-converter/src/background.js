/* Opening an extension page does not need the tabs permission. */
browser.action.onClicked.addListener(() => {
  browser.tabs.create({ url: browser.runtime.getURL("app.html") });
});
