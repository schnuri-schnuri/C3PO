let vocabulary;
let standardProfile = "noProfile";  //state variable :/
let messageShown = false; //yet another state variable
console.log("content script loaded!");

/**
 * All messaged messages will be saved here
 * @type {Object[]} messageQueue
 */
const messageQueue = [];

browser.runtime.onMessage.addListener(function(message){
    messageQueue.push(message);

    if(!messageShown){
        messageShown = true;
        showRequestOrWarning(messageQueue.shift());

    }

    return Promise.resolve("message received");
});

/**
 * Shows the next Request
 * If no other request is available message shown is set to false
 */
function showNext(){
    if(messageQueue.length > 0){
        showRequestOrWarning(messageQueue.shift());
    }else{
        messageShown = false;
    }
}




/**
 * Shows the request or the warning. If warning occurs, showNext() will never be called.
 * @param {Object} message
 */
function showRequestOrWarning(message){


    if(typeof message.noPrivacyHeaderWarning !== "undefined" && message.noPrivacyHeaderWarning === true){
        showWarning();
        return;
    }

    if(typeof message.showRequest !== "undefined" && message.showRequest === true && typeof message.request !== "undefined"){
        vocabulary = message.vocabulary;

        browser.storage.sync.get("doNotAskAgain")
            .then(function (results) {
                //console.log(results);
                if(typeof results !== "undefined" &&
                    typeof results.doNotAskAgain !== "undefined" &&
                    typeof results.doNotAskAgain[message.responseHost] !== "undefined" &&
                    results.doNotAskAgain[message.responseHost] === true){

                    //console.log("loaded donotaskagain");
                    throw "doNotAskagain";
                }
                else{
                    //console.log("user has not asked to be not asked again");
                }
            })
            .then(function(){
                return getSettingsObject(message.responseHost);
            })
            .then( function(current)
            {
                //console.log(current);
                showRequest(current, message.request, message.statusCode, message.vocabulary);
            })
            .catch((error)=>console.error(error));
    }
}

function showRequest(current, request, statusCode){


    //console.log("request received");
    //console.log(vocabulary);

    const formWrapper = document.createElement("div");
    formWrapper.id = "form_wrapper";
    formWrapper.style.setProperty("all", "unset");
    formWrapper.style.setProperty("position","fixed", "important");
    formWrapper.style.setProperty("bottom","5%", "important");
    formWrapper.style.setProperty("right","5%", "important");
    formWrapper.style.setProperty("z-index","2147483647", "important");
    formWrapper.style.setProperty("border","2px solid red", "important");
    formWrapper.style.setProperty("border-radius", "4px", "important");
    formWrapper.style.setProperty("padding", "3px", "important");
    formWrapper.style.setProperty("box-shadow",
        "3px 3px 3px grey, -3px -3px 3px grey, -3px 3px 3px grey, 3px -3px 3px grey", "important");
    formWrapper.style.setProperty("display", "block", "important");
    formWrapper.style.setProperty("width", "600px", "important");
    formWrapper.style.setProperty("height", "90%", "important");
    formWrapper.style.setProperty("overflow-y", "scroll", "important");
    formWrapper.style.setProperty("background-color", "white", "important");

    const h1 = document.createElement("h1");
    let h1String = "";
    if(request.id){
        h1String +=  request.id;
    }else{
        h1String += "This website";
    }
    if(statusCode === 406){
        h1String += " requires additional consent to show all contents.";
    }else {
        h1String += " requests additional consent.";
    }
    h1.innerText = h1String;
    formWrapper.appendChild(h1);

    const reasonP = document.createElement("p");
    reasonP.innerText = "The reason is: " + request.reason;
    formWrapper.appendChild(reasonP);

    const p = document.createElement("p");
    p.innerText = "Please choose if you want to give the website this consent!" +
        "You can always change your settings and withdraw consent in the add-on options.";
    formWrapper.appendChild(p);

    const doNotAskAgain = document.createElement("div");
    const doNotAskAgainCheckbox = document.createElement("input");
    doNotAskAgainCheckbox.type = "checkbox";
    doNotAskAgainCheckbox.id = "do_not_ask_again_checkbox";
    doNotAskAgain.appendChild(doNotAskAgainCheckbox);
    const doNotAskAgainP = document.createElement("p");
    doNotAskAgainP.innerText = "Do not ask again for this website";
    doNotAskAgainP.style.setProperty("display", "inline", "important");
    doNotAskAgain.appendChild(doNotAskAgainP);

    formWrapper.appendChild(doNotAskAgain);


    document.body.appendChild(formWrapper);

    buildForm(vocabulary);
    console.log("tried to build");

    setInputsFromSettingsObject(current);


    //todo dont show request, when everything is consented to

    //console.log("before");

    //console.log(request.setting);

    Object.keys(request.setting).forEach(function(key){
        if(key === "standardProfile"){
            return;
        }

        if(current.hasOwnProperty(key) &&
            (current[key] === 1 || request.setting[key] === current[key])){
            return;
        }

        const element = document.getElementById(key);

        if (element.tagName.toLowerCase() !== "input") {
            console.error("unexpected tagName " + element.tagName);
            return;
        }

        if (element.type === "radio") {
            console.error("Unexpected RadioButton");
            return;
        }

        if (element.type === "checkbox") {
            element.parentElement.style.background = "red";
            return;
        }

        if (element.type === "text") {
            const arrayOfTrackingRequests = request.setting[key].split(",");
            const trackingRequest = document.createElement("div");
            trackingRequest.id = "tracking_request";
            trackingRequest.style.setProperty("background-color", "red", "important");
            arrayOfTrackingRequests.forEach(function (trackerHost) {
                const trackerDiv = document.createElement("div");
                const trackingCheckbox = document.createElement("input");
                trackingCheckbox.type = "checkbox";
                trackingCheckbox.id = trackerHost;
                trackerDiv.appendChild(trackingCheckbox);
                const trackingP = document.createElement("p");
                p.style.setProperty("display", "inline", "important");
                p.innerText = trackerHost;
                trackerDiv.appendChild(trackingP);
                trackingRequest.appendChild(trackerDiv);
            });
            element.insertAdjacentElement("beforebegin", trackingRequest);

            element.value = request.setting[key] + ", " + element.value;
            return;
        }

        console.error("unexpected input type");

    });

    //console.log("after");

    vocabulary.allSubCheckboxes.forEach(curr => {
        //console.log("trying to add event listener");
        document.getElementById(curr).addEventListener("change", function (event) {
            if (standardProfileHasToBeUnset(curr, event.target.checked)) {
                unsetStandardProfile();
            }
        });
    });

    Object.keys(vocabulary.allElements).forEach(currMain => {
        document.getElementById(currMain).addEventListener("change", function () {
            setCheckboxByMain(currMain);
        });

        const checkboxList = vocabulary.allElements[currMain];

        checkboxList.forEach(curr => {
            document.getElementById(curr).addEventListener("change", function () {
                setMainCheckbox(currMain);

            });
        });
    });

    Object.keys(vocabulary.standardProfiles).forEach(function(standard){
        document.getElementById(standard).addEventListener("change", function () {
            setStandardProfile(standard);
        });
    });

    document.querySelector("#form_wrapper form").addEventListener("submit", function(event) {
        const newSettings = getSettings();
        //console.log(newSettings);
        newSettings.tracking_exceptions = newSettings.tracking_exceptions + getAdditionalTrackers();
        //console.log(newSettings);

        save(request.host, newSettings);
        if(doNotAskAgainCheckbox.checked){
            append("doNotAskAgain", request.host, true)
                .catch((error) => console.error(error));
        }
        document.body.removeChild(formWrapper);

        event.preventDefault();
        showNext();
    });

    document.getElementById("reloadButton").addEventListener("click", function(event){
        const newSettings = getSettings();
        //console.log(newSettings);
        newSettings.tracking_exceptions = newSettings.tracking_exceptions + getAdditionalTrackers();
        //console.log(newSettings);

        save(request.host, newSettings);
        if(doNotAskAgainCheckbox.checked){
            append("doNotAskAgain", request.host, true)
                .catch((error) => console.error(error));
        }
        document.body.removeChild(formWrapper);

        event.preventDefault();

        if(messageQueue.length > 0) {
            showNext();
            console.log("showNext");
        }else{
            console.log("reload");
            window.location.reload(true);
        }


    });

    document.getElementById("cancelButton").addEventListener("click", function(event){
        event.preventDefault();
        document.body.removeChild(formWrapper);
        showNext();
    });

}

/**
 * gets new tracker consent
 * @return {string}
 */
function getAdditionalTrackers(){
    const additionalTrackers = [];
    if(!document.getElementById("tracking_request")){
        return "";
    }
    document.getElementById("tracking_request").childNodes.forEach(function(trackerDiv){
        const checkbox = trackerDiv.childNodes[0];
        if(checkbox.checked){
            additionalTrackers.push(checkbox.id);
        }
    });
    return additionalTrackers.join(",");
}


function showWarning(){
    const warningWrapper = document.createElement("div");

    const p = document.createElement("p");
    p.innerText = "Warning! This page does not acknowledge your privacy settings sent by the browser!";
    p.style.setProperty("all", "unset");
    p.style.setProperty("color", "#ffffff", "important");
    p.style.setProperty("background-color", "#d70022", "important");
    p.style.setProperty("padding", "3px", "important");
    p.style.setProperty("border-radius", "4px", "important");
    p.style.setProperty("border", "2px solid white", "important");
    p.style.setProperty("font-family", 'apple-system, BlinkMacSystemFont, sans-serif, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif', "important");
    p.style.setProperty("font-size", "20pt", "important");

    warningWrapper.appendChild(p);
    warningWrapper.style.setProperty("position","fixed", "important");
    warningWrapper.style.setProperty("bottom","10px", "important");
    warningWrapper.style.setProperty("right","10px", "important");
    warningWrapper.style.setProperty("z-index","2147483647", "important");
    warningWrapper.style.setProperty( "pointer-events", "none", "important");
    warningWrapper.style.setProperty( "opacity", "0.8", "important");

    document.body.appendChild(warningWrapper);

    //console.log("should be appended");
}

function append(appendTo, key, data){
    return browser.storage.sync.get(appendTo)
        .then(function(results){
            if(typeof results === "undefined" || typeof results[appendTo] === "undefined"){
                return browser.storage.sync.set({[appendTo]: {[key]: data}});
            }

            const object = results[appendTo];
            object[key] = data;
            return browser.storage.sync.set({[appendTo]: object});
        });
}


//from utils

    /**
     * Gets the correct settings object.
     * @param {String} scope
     * @returns {Promise}
     */
     function getSettingsObject(scope){
        //console.log("scope: " + scope);
        return browser.storage.sync.get(scope)
            .then(function (results) {
                if(Object.keys(results).length === 0 && results.constructor === Object){
                    throw "website settings undefined";
                }else{
                    //console.log(results);
                    return results[scope];
                }
            })
            .catch(function () {
                return browser.storage.sync.get("general")
                    .then( function (results) {
                            if (Object.keys(results).length === 0 && results.constructor === Object) {
                                throw "general settings not found";
                            } else {
                                return results.general;
                            }
                        }
                    );
            })
            .catch(function(){
                console.warn("No settings found for " + scope);
                return new SettingObject(); //privacy by default
            });
    }

    function save (scope, data) {
        const saveObject = {};

        saveObject[scope] = data;

        return browser.storage.sync.set(saveObject)
            .catch(console.error);
    }



/**
 *
 * @constructor
 * @property {String} standardProfile
 * @property {String} tracking_exceptions
 */
function SettingObject(){
    vocabulary.allSubCheckboxes.forEach(function(subCheckbox){
        this[subCheckbox] = 0;
    }, this);

    this.standardProfile = "profile_A";
    this.tracking_exceptions = "";
}

function buildForm(vocabulary){
    const wrapper = document.getElementById("form_wrapper");

    const form = document.createElement("form");

    //create radio button fieldset
    const profileFieldset = document.createElement("fieldset");
    const profileLegend = document.createElement("legend");
    profileLegend.innerText = "Choose your privacy profile";
    profileFieldset.appendChild(profileLegend);

    Object.keys(vocabulary.standardProfileDescriptions).forEach(function(key){
        const div = document.createElement("div");

        const input = document.createElement("input");
        input.type ="radio";
        input.name = "profile";
        input.id = key;
        input.value = key;
        div.appendChild(input);

        const label = document.createElement("label");
        label.htmlFor = key;
        label.innerText = vocabulary.standardProfileDescriptions[key];
        div.appendChild(label);

        profileFieldset.appendChild(div);
    });
    form.appendChild(profileFieldset);

    //create checkbox table
    const checkboxFieldset = document.createElement("fieldset");
    const checkboxLegend = document.createElement("legend");
    checkboxLegend.innerText = "Choose your privacy profile";
    checkboxFieldset.appendChild(checkboxLegend);
    const table = document.createElement("table");

    //create table head row
    const thead = document.createElement('thead');
    const checkboxesTheadRow = document.createElement("tr");
    const labelTheadRow = document.createElement("tr");

    checkboxesTheadRow.append(document.createElement("th"));
    checkboxesTheadRow.append(document.createElement("th"));
    labelTheadRow.append(document.createElement("th"));
    labelTheadRow.append(document.createElement("th"));

    vocabulary.categories.forEach(function(category){
        const checkboxTh = document.createElement("th");
        const checkboxLabel = document.createElement("label");
        checkboxLabel.className = "table_field_label";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = category;
        input.name = category;

        checkboxLabel.appendChild(input);
        checkboxTh.appendChild(checkboxLabel);

        checkboxesTheadRow.appendChild(checkboxTh);

        const labelTh = document.createElement("th");
        const labelLabel = document.createElement("label");
        labelLabel.htmlFor = category;
        labelLabel.className = "table_field_label";
        labelLabel.title = vocabulary.categoryLongDescriptions[category];
        labelLabel.innerText = vocabulary.categoryShortDescriptions[category];

        labelTh.appendChild(labelLabel);
        labelTheadRow.appendChild(labelTh);
    });
    thead.appendChild(checkboxesTheadRow);
    thead.appendChild(labelTheadRow);
    table.appendChild(thead);


    //create table body
    const tbody = document.createElement("tbody");
    vocabulary.purposes.forEach(function(purpose){
        const tr = document.createElement("tr");

        const inputTd = document.createElement("td");
        inputTd.className = "checkbox_field";
        const mainCheckboxInput = document.createElement("input");
        mainCheckboxInput.type = "checkbox";
        mainCheckboxInput.id = purpose;
        mainCheckboxInput.name = purpose;
        inputTd.appendChild(mainCheckboxInput);
        tr.appendChild(inputTd);

        const labelTd = document.createElement("td");
        const mainCheckboxlabel = document.createElement("label");
        mainCheckboxlabel.title = vocabulary.purposeLongDescriptions[purpose];
        mainCheckboxlabel.htmlFor = purpose;
        mainCheckboxlabel.innerText = vocabulary.purposeShortDescriptions[purpose];
        labelTd.appendChild(mainCheckboxlabel);
        tr.appendChild(labelTd);

        vocabulary.categories.forEach(function(category){
            const td = document.createElement("td");
            td.className = "checkbox_field";
            const label = document.createElement("label");
            label.className = "table_field_label";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.id = category.toLowerCase() + "_" + purpose.toLowerCase();
            input.name = category.toLowerCase() + "_" + purpose.toLowerCase();
            label.appendChild(input);
            td.appendChild(label);
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    checkboxFieldset.appendChild(table);
    form.appendChild(checkboxFieldset);

    //third party trackers
    const trackersFieldset = document.createElement("fieldset");

    const trackersLegend = document.createElement("legend");
    trackersLegend.innerText = "Allowed third-party trackers";
    trackersFieldset.appendChild(trackersLegend);

    const trackersDiv = document.createElement("div");

    const trackersLabel = document.createElement("label");
    trackersLabel.htmlFor = "tracking_exceptions";
    trackersLabel.innerText = "Consent to third-party tracking by"; //todo all visible text in vocabulary?
    trackersDiv.appendChild(trackersLabel);

    const trackersInput = document.createElement("input");
    trackersInput.type = "text";
    trackersInput.id = "tracking_exceptions";
    trackersInput.name = "tracking_exceptions";
    trackersDiv.appendChild(trackersInput);

    trackersFieldset.appendChild(trackersDiv);
    form.appendChild(trackersFieldset);

    //submit
    const p = document.createElement("p");
    p.innerText = "You have the right to withdraw consent at any time. To change the settings, please use the extension popup or visit the extension options.";
    form.appendChild(p);

    const okButton = document.createElement("button");
    okButton.title = "Consent to data collection and processing as specified above.";
    okButton.type = "submit";
    okButton.innerText = "Consent!";
    form.appendChild(okButton);

    const reloadButton = document.createElement("button");
    reloadButton.title = "Consent to data collection and processing as specified above, and reload the page.";
    reloadButton.id = "reloadButton";
    reloadButton.innerText = "Consent and reload page!";
    form.appendChild(reloadButton);

    const cancelButton = document.createElement("button");
    cancelButton.title = "Do not change any settings. Close Window";
    cancelButton.innerText = "Cancel!";
    form.appendChild(cancelButton);
    cancelButton.id = "cancelButton";

    wrapper.appendChild(form);
}


//from privacy_settings.js

//took parts of https://github.com/mdn/webextensions-examples/blob/master/favourite-colour/options.js

//TODO update to fit to vocabulary of protocol\
//TODO add requirement for user agents: should be expandable in terms of vocab.



/**
 * Checks if an checkbox is checked
 * @param {string} id id of element
 * @returns {number} 0 if is not checked, 1 if is checked, 2 if indeterminate
 */
function getIsChecked(id) {
    if (document.getElementById(id).indeterminate) return 2;
    if (document.getElementById(id).checked) return 1;
    return 0;
}

/**
 * Checks if all or none of a array of checkboxes are checked
 * @param {String[]} arr Array of element ids
 * @returns {number} 0 if no checkbox is checked, 1 if all checkboxes are checked, 2 if neither all are checked nor all are unchecked
 */
function listCheckedStatus(arr) {
    if (arr.every((elem) => getIsChecked(elem) === 0)) return 0;
    if (arr.every((elem) => getIsChecked(elem) === 1)) return 1;
    return 2;
}

/**
 * Returns if the checkbox with the id is a main-checkbox
 * @param {String} id id of checkbox
 * @returns {boolean} true if it is main checkbox, false otherwise
 */
function isMain(id) {
    return Object.keys(vocabulary.allElements).includes(id);
}

/**
 * Checks if the standard profile has to be unchecked after state of a checkbox changed
 * @param {String} id id of checkbox
 * @param {Boolean} checked checked if checkbox is checked
 * @returns {Boolean}
 */
function standardProfileHasToBeUnset(id, checked) {
    if (!vocabulary.allSubCheckboxes.includes(id)) {
        //console.error("id " + id + " not the usecase for function standardProfileHasToBeUnset")
        return false;
    }

    if (standardProfile === "noProfile") {
        return false;
    }

    if (vocabulary.standardProfiles[standardProfile].includes(id)) {
        return !checked;
    } else {
        return checked;
    }
}

/**
 * unsets the standard profile
 */
function unsetStandardProfile() {
    standardProfile = "noProfile";

    for(const standardProfile in vocabulary.standardProfiles){
        if(! vocabulary.standardProfiles.hasOwnProperty(standardProfile)){
            continue;
        }

        document.getElementById(standardProfile).checked = false;
    }
}

/**
 * Sets checkbox to checked, !checked or indeterminate
 * @param {string} id id of checkbox
 * @param {number } value 0 for not checked, 1 for checked, 2 for indeterminate
 */
function setCheckbox(id, value) {
    const checkbox = document.getElementById(id);
    switch (value) {
        case 0:
            checkbox.checked = false;
            checkbox.indeterminate = false;

            if (standardProfileHasToBeUnset(id, false)) {
                unsetStandardProfile();
            }
            break;
        case 1:
            checkbox.checked = true;
            checkbox.indeterminate = false;

            if (standardProfileHasToBeUnset(id, true)) {
                unsetStandardProfile();
            }
            break;
        case 2:
            if (!isMain(id)) {
                throw "tried to set not-main-checkbox to indeterminate";
            }
            checkbox.checked = false;
            checkbox.indeterminate = true;
            break;
    }

    //if it is no main checkbox
    if (!Object.keys(vocabulary.allElements).includes(id)) {
        const event = new Event("change");
        checkbox.dispatchEvent(event);
    }
}

/**
 * Sets an array of checkboxes to the defined value
 * @param {String[]} arr array of checkboxes
 * @param {number} value if 0 sets all to not checked, if 1 sets all to checked
 */
function setCheckboxList(arr, value) {
    arr.forEach(curr => setCheckbox(curr, value));
}

/**
 * Sets the checkboxes who belong to one main element
 * @param {String} id id of main checkbox can mostly be one of 11 strings
 */
function setCheckboxByMain(id) {
    if (!isMain(id)) {
        console.trace("error");
        throw "maybe wrong usage of setCheckboxByMain? id not in mainCheckboxes array";
    }

    const checkboxValue = getIsChecked(id);

    if (checkboxValue === 2)
        throw "setCheckboxByMain maybe used in wrong context? checkBoxValue === 2";
    else
        setCheckboxList(vocabulary.allElements[id], checkboxValue);
}

/**
 * Sets the main checkbox corresponding to its row or column
 * @param {string} id id of main checkbox
 */
function setMainCheckbox(id) {
    if (!isMain(id)) {
        console.trace("error");
        throw "maybe wrong usage of setCheckboxByMain? id not in mainCheckboxes array";
    }

    const checkboxValue = listCheckedStatus(vocabulary.allElements[id]);
    setCheckbox(id, checkboxValue);
}

/**
 * Checks checkboxes according to standard profile
 * @param id id of profile
 */
function setStandardProfile(id) {

    if (vocabulary.standardProfiles.hasOwnProperty(id)) {
        standardProfile = id;
    } else {
        throw "standard profile not found";
    }

    const standardProfileArr = vocabulary.standardProfiles[id];

    //first set subCheckboxes
    vocabulary.allSubCheckboxes.forEach(curr => {
        if (standardProfileArr.includes(curr)) {
            setCheckbox(curr, 1);
        } else {
            setCheckbox(curr, 0);
        }
    });

    //then set RadioButtons
    for(const currStandardProfile in vocabulary.standardProfiles){
        if(! vocabulary.standardProfiles.hasOwnProperty(currStandardProfile)){
            continue;
        }

        document.getElementById(currStandardProfile).checked = currStandardProfile === standardProfile;
    }

}

/**
 * returns Object of  settings from checkboxes, radio buttons and text input
 * @returns {Object} object of
 */
function getSettings() {
    const settings = {};

    settings.standardProfile = standardProfile;

    /**mainCheckboxes.forEach(curr => {
        settings[curr] = getIsChecked(curr);
    });
     **/

    vocabulary.allSubCheckboxes.forEach(curr => {
        if (curr === "standardProfile") {
            throw "'standardProfile' is no valid name for a subCheckbox.";
        }
        settings[curr] = getIsChecked(curr);
    });

    settings.tracking_exceptions = document.getElementById("tracking_exceptions").value;

    return settings;
}

/**
 * Takes the settings in object checks checkboxes and radiobutton and sets text input value
 * @param {Object} obj object containing settings;
 */
function setInputsFromSettingsObject(obj) {
    for (const fieldName in obj) {

        if (!obj.hasOwnProperty(fieldName)) {
            continue;
        }

        if (fieldName === "standardProfile" && obj[fieldName] === "noProfile") {
            unsetStandardProfile();
            continue;
        }

        if (fieldName === "standardProfile" && obj[fieldName] !== "noProfile") {
            setStandardProfile(obj[fieldName]); //todo now checkboxes are double checked, if there is a profile
            continue;
        }

        const element = document.getElementById(fieldName);

        if (element.tagName.toLowerCase() !== "input") {
            console.error("unexpected tagName " + element.tagName);
            continue;
        }

        if (element.type === "radio") {
            console.error("Unexpected RadioButton");
            continue;
        }

        if (element.type === "checkbox") {
            setCheckbox(fieldName, obj[fieldName]);
            continue;
        }

        if (element.type === "text") {
            element.value = obj[fieldName];
            continue;
        }

        console.error("unexpected input type");
    }
}