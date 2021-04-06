import utils from "/utils.js";

/**
 * Returns promise which fulfills with hostname
 * Function modified from https://stackoverflow.com/questions/46079716/firefox-webextension-api-how-to-get-the-url-of-the-active-tab
 * @returns {Promise} - the promise
 */
function getTabHost(){
    return browser.tabs.query({currentWindow: true, active: true})
        .then(function(tabs){
            const tab = tabs[0];
            console.log("tab.url: " + tab.url);
            const tabUrl = new URL(tab.url);
            if(tabUrl.host === undefined || tabUrl.host === ""){
                console.error("tabUrl.host is undefined or empty!");
            }
            console.log("host: " + tabUrl.host);
            return tabUrl.host;
        })
        .catch(console.error);
}

/**
 * Sets "doNotAskAgain" checkbox if "doNotAskAgain" is choosen by user.
 * @param host
 */
function setCheckbox(host){
    browser.storage.sync.get("doNotAskAgain")
        .then(function(result){
           if(result.doNotAskAgain[host]){
               document.getElementById("do_not_ask_again_checkbox").checked = true;
           }
        });
}

document.addEventListener("DOMContentLoaded", function () {

    getTabHost().then(function (host) {
        document.getElementById("websiteSettingIframe").name=host;
        document.getElementById("websiteHost").innerText=host;
        setCheckbox(host);
    });

});

document.getElementById("do_not_ask_again_checkbox").addEventListener("change", function () {
    utils.append("doNotAskAgain",
        document.getElementById("websiteHost").innerText,
        document.getElementById("do_not_ask_again_checkbox").checked)
        .catch((error) => console.error(error));
});

window.addEventListener("message",function(event){ //https://stackoverflow.com/a/15778779
    if(event.data === "cancel"){
        window.close();
    }
    if(event.data === "stored"){
        window.close();
    }
});