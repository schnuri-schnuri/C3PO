window.addEventListener("message",function(event){ //https://stackoverflow.com/a/15778779
    if(event.data === "stored"){

        //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Extension_pages
        let removing = browser.windows.remove(browser.windows.WINDOW_ID_CURRENT);
        removing.catch(console.error);
    }
    if(event.data === "cancel"){
        alert("Please choose a privacy setting.");
        event.stopPropagation();
    }
});

