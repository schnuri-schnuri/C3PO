console.log("utils");

import vocabulary from "/vocabulary.js";

const utils = {
    /**
     * Gets the correct settings object.
     * @param {String} scope
     * @returns {Promise}
     */
    getSettingsObject : function (scope){
        //console.log("scope: " + scope);
    return browser.storage.sync.get(scope)
        .then(function (results) {
            if(Object.keys(results).length === 0 && results.constructor === Object){
                throw "website settings undefined";
            }else{
                console.log(results);
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
            return new utils.SettingObject(); //privacy by default
        });
    },

    save: function (scope, data) {
        const saveObject = {};

        saveObject[scope] = data;

        return browser.storage.sync.set(saveObject)
            .catch(console.error);
    }
};

/**
 *
 * @constructor
 * @property {String} standardProfile
 * @property {String} tracking_exceptions
 */
utils.SettingObject = function(){
    vocabulary.allSubCheckboxes.forEach(function(subCheckbox){
        this[subCheckbox] = 0;
    }, this);

    this.standardProfile = "profile_A";
    this.tracking_exceptions = "";
};

utils.buildForm = function(vocabulary){
    const wrapper = document.getElementById("form_wrapper");

    const form = document.createElement("form");
    form.id = "privacyForm";

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
    checkboxLegend.innerText = "Adapt your privacy preferences";
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
            label.style.display = "block";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.id = category.toLowerCase() + "_" + purpose.toLowerCase();
            input.name = category.toLowerCase() + "_" + purpose.toLowerCase();
            input.style.display = "block";
            input.style.margin = "auto";
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

    const cancelButton = document.createElement("button");
    cancelButton.title = "Do not change any settings. Close Window";
    cancelButton.innerText = "Cancel!";
    cancelButton.id = "cancelButton";
    form.appendChild(cancelButton);

    wrapper.appendChild(form);
};

/**
 * Deletes all settings of this extension.
 * @returns {Promise}
 */
utils.deleteAllSettings = function(){
    return browser.storage.sync.clear()
        .catch(console.error);
};

utils.append = function(appendTo, key, data){
    return browser.storage.sync.get(appendTo)
        .then(function(results){
            if(typeof results === "undefined" || typeof results[appendTo] === "undefined"){
                return browser.storage.sync.set({[appendTo]: {[key]: data}});
            }

            const object = results[appendTo];
            object[key] = data;
            return browser.storage.sync.set({[appendTo]: object});
        });
};

export default utils;