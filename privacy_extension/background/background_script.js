import vocabulary from "../vocabulary.js";
import utils from "../utils.js";

const tabHosts = {};

console.log("background");

/**
 * @param {Object} obj - object with ids like {"coo_fcn": 1, "coo_per": 1, "equ_fcn": 1...}
 * @returns {String[]} - All keys with value 1 in array
 */
function convertToArrayOfConsented(obj){
    console.log(obj);
    const array = [];

    Object.keys(obj).forEach((fieldName) => { //todo test if forEach works as for ... in ...
        if(fieldName === "standardProfile"){
        return;
    }

        if(obj[fieldName] === 1) {
            array.push(fieldName);
        }
    });

    return array;
}


/**
 * @param {String[]} arr - All keys with value 1 in array
 * @returns {Object} - settings object sorted by purpose ("fcn": ["coo", "equ"], "per":["coo",...
 */
function convertToSettingsObject(arr){
    const settings = {};

    arr.forEach(curr=>{
        const elements = curr.split("_");

        if (!settings.hasOwnProperty(elements[1])) {
            settings[elements[1]] = [];
        }

        settings[elements[1]].push(elements[0]);
    });

    return settings;
}

/**
 * Collects the purposes that have the same categories
 * @param {Object} obj - object with purposes as keys and category groups as value
 * @returns {Object} obj - something like {"coo equ": ["adm", "ana"], ...}
 */
function sortByCategoryGroup(obj){
    const categoryGroupObject = {};

    //first collect all purposes with same category group
    for(const fieldName in obj) {
        if(! obj.hasOwnProperty(fieldName)){
            continue;
        }

        const key = obj[fieldName];
        const sortedKey = key.sort();
        const categoryGroup = sortedKey.join(" ");

        if(! categoryGroupObject.hasOwnProperty(categoryGroup)){
            categoryGroupObject[categoryGroup] = [];
        }

        categoryGroupObject[categoryGroup].push(fieldName);
    }

    return categoryGroupObject;
}



/**
 * Generates category-purpose part of header from categoryGroupObject
 * @param {Object} obj
 * @returns{String}
 */

function generatePrivacyHeaderPart(obj){
    if(Object.keys(obj).length === 0 && obj.constructor === Object){ // from https://stackoverflow.com/a/32108184
        console.log("generatePrivacyHeaderPart: no consent");
        return "{NOT}";
    }

    const headerValueArray = [];

    //then merge it to categoryPurposeGroup
    for(const categoryGroup in obj){
        if(! obj.hasOwnProperty(categoryGroup)){
            continue;
        }

        const value = obj[categoryGroup];
        const sortedValue =  value.sort();
        const purposeGroup = sortedValue.join(" ");

        const categoryPurposeGroup = "{" + categoryGroup + " " + purposeGroup + "}";
        headerValueArray.push(categoryPurposeGroup);
    }

    headerValueArray.sort(function(a,b){
        return b.length - a.length  || a.localeCompare(b); // taken and adapted from https://stackoverflow.com/a/10630852
    });

    return headerValueArray.join("");
}

/**
 * Checks if {NOT} has to be send
 * @param {Object} obj - the settings object
 * @returns {boolean} - True: not is selected, we have to send {NOT}
 */
function notSelected(obj) {
    if(obj.standardProfile === "profileA"){
        return true;
    }

    for(const fieldName in obj) {
        if (!obj.hasOwnProperty(fieldName)) {
            continue;
        }

        if (fieldName === "standardProfile") {
            continue;
        }

        if(obj[fieldName] === 1){
            return false;
        }
    }

    return true;
}


/**
 * Chooses and generates standardHeader
 * @param {Object} obj
 * @returns {String[]} header
 */
function chooseStandardSetting(obj){
    const profile = vocabulary.standardProfileSorting.find(function(profile){
        return vocabulary.standardProfiles[profile].every(curr => obj[curr] === 1);
    });

    if(typeof profile !== "undefined"){
        return vocabulary.standardProfiles[profile];
    }else{
        return [];
    }
}

/**
 * Returns setting string
 * @param {Object} obj
 * @param {Boolean} standardSetting - if Standardsetting is needed
 * @returns {string}
 */
function generateSettingStr(obj, standardSetting){
    if(notSelected(obj)){
        return "{NOT}";
    }

    if(standardSetting){
        return generatePrivacyHeaderPart(sortByCategoryGroup(convertToSettingsObject(chooseStandardSetting(obj))));
    }

    return generatePrivacyHeaderPart(sortByCategoryGroup(convertToSettingsObject(convertToArrayOfConsented(obj))));
}

/**
 * Generate header from saved settings
 * @param {Object} obj
 * @param {Boolean} standardSetting - if Standardsetting is needed
 * @returns {String} - the header value
 */
function generateHeaderValue(obj, standardSetting){
    const notOrSettingStr = generateSettingStr(obj, standardSetting);

    let trackingStr;
    if(typeof obj.tracking_exceptions !== "undefined" && obj.tracking_exceptions.length > 0){
        const globalTrackingArr = obj.tracking_exceptions.split(/\s*[,;]\s*/);
        trackingStr = "{global-tracking "+ globalTrackingArr.join(" ") + "}";
    } else {
        trackingStr = "";
    }

    return notOrSettingStr + trackingStr;
}


/**
 * Returns promise, fulfilled when the url is already visited, rejected otherwise
 * @param {String} url
 * @returns {Promise}
function urlAlreadyVisited(url){
    return browser.history.search({text: url})
        .then(function (result){
            if(result.length < 1){
                throw "no results";
            }
            if(! result.find(curr => curr.url === url)){
                console.log("no url result matching");
                throw "results, but not matching";
            }
        });
}*/

/**
 * Returns promise, fulfilled when the host is already visited, rejected otherwise
 * @param {String} host
 * @returns {Promise}
 */
function hostAlreadyVisited(host) {
    return browser.history.search({text: host})
        .then(function (result) {
            if (result.length < 1) {
                console.log(host + " is not already visited");
                throw "no results";
            }
            if (!result.find(function (curr) {
                const currUrl = new URL(curr.url);
                return currUrl.host === host;
            })) {
                console.log(host + " is not already visited");
                throw "results, but not matching";
            }
        });
}

/**
 * Takes privacy string and returns askObject
 * @param {String} privacyString
 */
function disassemblePrivacyString(privacyString){
    try {
        const askObject = {};
        console.log(privacyString);

        const regex = /ACK( {ASK {(.*)} ID{(.*)} TXT{(.*)}})?/gi;
        const regexArray = regex.exec(privacyString);

        if(typeof regexArray[0] !== "string" || regexArray[0].length === 0){
            console.log("no additional consent requested");
            return;
        }

        //console.log(regexArray);
        askObject.setting = disassembleSettingAndTrackingString(regexArray[2]);
        askObject.id = regexArray[3];
        askObject.reason = regexArray[4];

        //console.log(askObject);

        return askObject;
    } catch(e) {
        return;
    }
}

/**
 * Takes the preference string and creates consentObject
 * @param {String} str
 * @returns {utils.SettingObject}
 */
function disassembleSettingAndTrackingString(str) {
        const regexIncludingCurlyBraces = /{([^}]+)}/gi;
        const requested = new utils.SettingObject();

        const stringParts = str.match(regexIncludingCurlyBraces);
        stringParts.forEach(function (stringPart) {
            if (stringPart.includes("global-tracking")) {
                disassembleTrackingString(stringPart, requested);
            } else {
                disassembleSettingString(stringPart, requested);
            }

        });

        return requested;
}

/**
 * disassembles the setting string and modifies the object passed
 * @param {String} string
 * @param {utils.SettingObject} object
 */
function disassembleSettingString(string, object){
    const elementStr = string.substring(1, string.length - 1);
    const elementArr = elementStr.split(" ");

    const categories = [];
    const purposes = [];


    elementArr.forEach(function (element) {
        if(vocabulary.categories.includes(element)){
            categories.push(element);
            return;
        }
        if(vocabulary.purposes.includes(element)){
            purposes.push(element);
            return;
        }

        console.error("unknown element: " + element);
        throw "unknown element";
    });

    categories.forEach(function(category){
        purposes.forEach(function(purpose){
            const key = category + "_" + purpose;
            if(!object.hasOwnProperty(key)){
                console.error(key + "not in setting object");
            }
            object[key] = 1;
        });
    });
}

/**
 * Disassembles the {global-tracking ...} part of the header value
 * @param {String} string
 * @param {utils.SettingObject} object
 */
function disassembleTrackingString(string, object){
    object.tracking_exceptions = string.substring(string.indexOf("global-tracking") + "global-tracking".length, string.length-1);
}

/**
 * Returns if request/response is from /to  the top-level document
 * @param {Object} details
 * @return {boolean}
 */
function isTopLevel(details){
    return typeof details.documentUrl === "undefined";
}

/**
 * Returns if we can be sure that the resource is from a first party
 * @param {Object} details
 * @return {boolean}
 */
function isFirstParty(details){
    if(isTopLevel(details)){
        return true;
    }

    if(typeof tabHosts[details.tabId] === "undefined"){
        return false; //if tabHosts[details.tabId] is undefined, but it is not the top-level document, we cannot be sure that this is a first party resource
    }

    if(typeof details.requestHeaders !== "undefined"){
        //it's a request
        const headers = details.requestHeaders; //todo response headers do not contain host
        const host = headers[0].value.toLowerCase();

        return tabHosts[details.tabId] === host;
    }else {
        //else it's a response
        const url = new URL(details.url);
        return tabHosts[details.tabId] === url.host;
    }
}

function sendMessage(tabId, message){
    return browser.tabs.sendMessage(tabId, message)
        .catch(function (error) {
            console.error(error);
            console.error("something went wrong");
        });
}


function handleResponse(details) {
    const privacyResponse = details.responseHeaders.find(curr => curr.name.toLowerCase() === vocabulary.headerNames.ack.toLowerCase());

    const responseUrl = new URL(details.url);
    const responseHost = responseUrl.host;


    if (!isTopLevel(details) && !isFirstParty(details)) {
        console.log(responseHost + " is third party.");
        return;
    }
    if (!isTopLevel(details) && typeof privacyResponse === "undefined") {
        console.log(responseHost + " is not top level. no privacy request");
        return;
    }
    if (isTopLevel(details) && typeof privacyResponse === "undefined"){
        //send warning
        console.warn("Top-Level Document has not send a privacy response!");

        //always event handler, beacause content script is loaded after top-level document
        //todo maybe race condition possible?

        browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (changeInfo.status === "complete" && tabId === details.tabId) {
                browser.tabs.onUpdated.removeListener(listener);
                browser.tabs.sendMessage(details.tabId, {noPrivacyHeaderWarning: true})
                    .catch(console.error);
            }
        }, {properties: ["status"], tabId: details.tabId});
    return;
    }


    //is first party (and maybe toplevel), and has privacyResponse

    const privacyString = privacyResponse.value.toLowerCase();

    if(privacyString === "ack"){
        //console.log("privacy preferences acked");
        //no further actions required.
        return;
    }

    console.log("possible privacy request received");
    const request = disassemblePrivacyString(privacyString);

    if(typeof request === "undefined"){

        browser.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (changeInfo.status === "complete" && tabId === details.tabId) {
                browser.tabs.onUpdated.removeListener(listener);
                browser.tabs.sendMessage(details.tabId, {noPrivacyHeaderWarning: true})
                    .catch(console.error);
            }
        }, {properties: ["status"], tabId: details.tabId});
        return;
    }

    request.host = responseHost;

    browser.tabs.get(details.tabId)
        .then(function(tab) {
            if (tab.status === "complete") {

                sendMessage(details.tabId, {
                    showRequest: true,
                    request: request,
                    responseHost: responseHost,
                    vocabulary: vocabulary,
                    statusCode: details.statusCode
                });
            }else{
                browser.tabs.onUpdated.addListener(function listener (tabId, changeInfo){
                    if(changeInfo.status === "complete" && tabId === details.tabId) {
                        console.log("sent request");
                        browser.tabs.onUpdated.removeListener(listener);

                        sendMessage(details.tabId, {
                            showRequest: true,
                            request: request,
                            responseHost: responseHost,
                            vocabulary: vocabulary,
                            statusCode: details.statusCode
                        });

                    }
                }, {properties: ["status"], tabId: details.tabId});
            }
        });
}


browser.webRequest.onBeforeSendHeaders.addListener(function(details){
        return new Promise((resolve, reject) => {
            const headers = details.requestHeaders;
            const host = headers[0].value.toLowerCase();


            if (isTopLevel(details)) {

                console.log(host + " is the main document");
                const tabUrl = new URL(details.url); //save url of tab
                tabHosts[details.tabId] = tabUrl.host;

            } else {

                if (! isFirstParty(details)) {

                    resolve({requestHeaders: headers});
                    return;
                }

                console.log(host + " is embedded first party content, because" +
                    " host is " + host +
                    " and tab top level url" + tabHosts[details.tabId]);
            }

            hostAlreadyVisited(host)
                .then(function(){
                    console.log("already visited");
                    console.log(host);
                    return utils.getSettingsObject(host)
                        .then(result => generateHeaderValue(result, false)); //send full consent
                })
                .catch(function(){
                    console.log("first time visit");
                    return utils.getSettingsObject(host)
                        .then(result => generateHeaderValue(result, true)); //standard setting, when url for the first time
                })
                .then(function (headerValue) {
                    const newHeaderField = {
                        name: vocabulary.headerNames.consent,
                        value: headerValue
                    };

                    console.log(newHeaderField);
                    headers.push(newHeaderField);
                    resolve({requestHeaders: headers});
                })
                .catch(function (err) {
                    console.error(err);
                    reject(err);
                });

        }).catch(console.error);
},
    {urls: ["<all_urls>"]/*,
    types: ["main_frame"]*/},  //https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/webRequest/ResourceType
    ["blocking", "requestHeaders"]);


browser.webRequest.onCompleted.addListener(function(details){
    handleResponse(details);
}, {urls: ["<all_urls>"]}, ["responseHeaders"]);