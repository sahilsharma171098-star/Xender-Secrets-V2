const extension = typeof browser !== 'undefined' ? browser : chrome;
document.querySelector('#open').onclick = async () => {
  await extension.tabs.create({url: extension.runtime.getURL('recorder.html')});
  window.close();
};
