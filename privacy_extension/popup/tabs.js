"use strict";

let current = "generalSettingsContainer"; //state

/**
 * Switches to the tab with the id.
 * @param {String} id - id of container
 */
function switchTo(id) {

    document.getElementById(current).style.display = "none";
    document.getElementById(id).style.display = "block";


    current = id;
}

document.getElementById("generalSettingsTab").addEventListener("click",function(){
    switchTo("generalSettingsContainer");
});

document.getElementById("websiteSettingsTab").addEventListener("click", function(){
    switchTo("websiteSettingsContainer");
});

document.addEventListener("DOMContentLoaded", function(){
    switchTo("websiteSettingsContainer");
});