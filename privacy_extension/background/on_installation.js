console.log("on_installation.js");

browser.runtime.onInstalled.addListener(function () { //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onInstalled
    console.log("onInstalled");

    const creating = browser.windows.create({
        type: "detached_panel",
        url: "../welcome/welcome.html",
        state: "fullscreen"

    });
    creating.catch(console.error);
});

