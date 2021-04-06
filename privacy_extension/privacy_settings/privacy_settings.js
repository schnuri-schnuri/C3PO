//took parts of https://github.com/mdn/webextensions-examples/blob/master/favourite-colour/options.js

//TODO update to fit to vocabulary of protocol\
//TODO add requirement for user agents: should be expandable in terms of vocab.

import vocabulary from "../vocabulary.js";
import utils from "../utils.js";

let standardProfile = "noProfile";  //state variable :/

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

/*function presentRequest(){
    let request;
    let curr;
    browser.storage.sync.get("!request")
        .catch(console.error)
        .then(function(result){
            request = result["!request"];
            return utils.getSettingsObject(request.host);
        })
        .then(function(result){
            curr = result;
            setInputsFromSettingsObject(result);
        })
        .then(function(){
            Object.keys(request.setting).forEach(function(key){
                if(curr.hasOwnProperty(key) && (curr[key] === 1 || request.setting[key] === curr[key])){
                    console.log("not changed or requested");
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
                    //todo mark added request
                    element.value = request.setting[key] + ", " + element.value;
                    return;
                }

                console.error("unexpected input type");

            });
        });

}*/


function saveOptions(e) {
    const scope = window.name;
    utils.save(scope, getSettings())
        .then(function(){
            window.parent.postMessage("stored", "*");
        });

    e.preventDefault();
}

function loadOptions(e) {
    const scope = window.name;

/*    if(scope === "!request"){
        presentRequest();
        e.preventDefault();
        return;
    }*/

    setStandardProfile("profile_A");

    utils.getSettingsObject(scope)
        .then(function (results) {
            setInputsFromSettingsObject(results);
        })
        .catch(console.error);
    e.preventDefault();
}


vocabulary.allSubCheckboxes.forEach(curr => {
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

document.getElementById("cancelButton").addEventListener("click", function (event) {
    window.parent.postMessage("cancel", "*");
    event.preventDefault();
});
document.querySelector("form").addEventListener("submit", saveOptions);
document.addEventListener('DOMContentLoaded', loadOptions);
