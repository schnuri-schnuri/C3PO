
/**
 * reloads the settings iframe
 */
function reloadIframe(){

    const iframe = document.getElementById('settingsIframe');
    iframe.contentWindow.location.reload();

}

/**
 * Loads the options for all websites with specific settings and  append them to the select element
 */
function loadOptions(){
    document.getElementById("settings-select").innerHTML = "<option value='general' selected='selected'>General Settings</option>";
    browser.storage.sync.get(null)
        .then(function(results){
            const optionsArray = [];
            for(const fieldName in results){
                if(! results.hasOwnProperty(fieldName)){
                    continue;
                }

                if(fieldName === "doNotAskAgain" || fieldName === "general" || fieldName.length <= 0){
                    continue;
                }

                optionsArray.push(fieldName);
            }
            return optionsArray;
        })
        .then(function(optionsArray){
            const select = document.getElementById("settings-select");
            optionsArray.forEach(function (curr) {
                const newOption = document.createElement("option");
                newOption.value = curr;
                newOption.innerText = curr;

                select.appendChild(newOption);

            });

            select.addEventListener("change", function(e){
                console.log(e.target.value);
                changeSettings(e.target.value);
            });
        })
        .catch(console.error);
}

/**
 * Changes the settings page
 * @param {String} setting - the setting page ("general" or some hostname)
 */
function changeSettings(setting){
    const iframe = document.getElementById("settingsIframe");
    iframe.name = setting;
    reloadIframe();
}

function deleteAllSettings(){
    return browser.storage.sync.clear()
        .catch(console.error);
}


document.getElementById("deleteButton").addEventListener("click", function(){
    console.log("trying to delete");
    deleteAllSettings()
        .then(function(){
            console.log("deleted!");
            reloadIframe();
            loadOptions();
        });
});

document.addEventListener('DOMContentLoaded', loadOptions);

//todo possibility to uncheck donotaskagain