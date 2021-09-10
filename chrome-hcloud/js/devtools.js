const devtools = chrome.devtools;
// panel.html 这个devtools拓展真正的操作页面
devtools.panels.create('hCloud', null, 'panel.html', (panel) => {})

