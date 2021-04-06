console.log("vocabulary");

const vocabulary = {

    headerNames: {
        consent: "x-accept-privacy",
        ack: "x-privacy"
    },

    categories: ["coo", "equ", "geo", "sfw"],
    purposes: ["fcn", "per", "adm", "ana", "com", "trd", "loc"],

    standardProfileSorting : ["profile_D", "profile_C", "profile_B", "profile_A"], //order in which standard preferences should be chosen. in this example trivial, but maybe not in later examples
    standardProfiles: {
        profile_A: [],
        profile_B: ["coo_fcn", "equ_fcn"],
        profile_C: ["coo_fcn", "coo_per", "coo_adm", "coo_ana", "equ_fcn", "equ_per", "equ_adm", "equ_ana"],
        profile_D: ["coo_fcn", "coo_per", "coo_adm", "coo_ana", "coo_com", "coo_trd", "equ_fcn", "equ_per", "equ_adm", "equ_ana", "equ_com", "equ_trd"]
    },

    //using this, to have everything bundled but the webExtension i18n would be an option, too
    standardProfileDescriptions: {
        profile_A: "Never accept cookies. Do not consent to any data collection.",
        profile_B: "Allow cookies and terminal access for functional purposes.",
        profile_C: "Allow data collection for functional and analytical purposes and for personalized content.",
        profile_D: "Allow all cookies. Consent to all tracking. Warning! Allowing all cookies can be dangerous for your privacy!", //put warning in description

    },
    categoryShortDescriptions: {
        coo: "Allow Cookies",
        equ: "Allow collection of data from your equipment",
        geo: "Allow collection of geo-location data",
        sfw: "Allow the execution of software"
    },
    categoryLongDescriptions: {
        coo: "Allow the website to read and set cookies for the purposes you consent to.",
        equ: "Allow the collection from your equipment (for example your operating system, your browser version, or you screen size) for the purposes you consent to.",
        geo: "Allow the collection of geo-location data (for example GPS data, if your device has a GPS) for the purposes you consent to.",
        sfw: "Allow the collection of data by the execution of software ( for example multimedia players, or interactive programming language viewers)."
    },
    purposeShortDescriptions:{
        fcn: "Tracking for functional purposes",
        per: "Tracking for personalized content",
        adm: "Collect Data for improving the website (without tracking)",
        ana: "Tracking to improve the website",
        com: "Tracking for commercial purposes",
        trd: "Providing personal data to third parties",
        loc: "Tracking your location",
    },

    purposeLongDescriptions:{
        fcn: "Data is used, and you are followed across the website, to enable functions of the website.",
        per: "Data is used, and you are followed across the website, to personalized content (for example content suggestions).",
        adm: "The website provider may use the data to improve the website. However, the provider does not follow you across the web.",
        ana: "The website operator may track you across the pages of the website to analyze the website traffic to improve their website",
        com: "Data may be used to track you across the web for commercial purposes or for direct marketing for non-commercial purposes.",
        trd: "The website is allowed to send the data to third parties. For example, it is allowed to send tracking services the data. With that, these tracking services may know which websites you visit and what you do there. Tracking is possible even over the long term. This data may be used for automated decision-making.  For example, it is possible that you have to pay a higher price for some product because you visited a particular website. Generally, it is advised to only give consent to this (click one checkbox in this row) if you can be sure that you can trust the website. In doubt, do not check any boxes.",
        loc: "Your data is used to determine your location and to create a location history.."
    }


};

function generateAllElements(){
    const returnObject = {};
    vocabulary.categories.forEach(function(category){
       returnObject[category] = [];
       vocabulary.purposes.forEach(function(purpose){
          returnObject[category].push(category + "_" + purpose);
       });
    });
    vocabulary.purposes.forEach(function(purpose){
        returnObject[purpose] = [];
        vocabulary.categories.forEach(function(category){
            returnObject[purpose].push(category + "_" + purpose);
        });
    });
    console.log(returnObject);
    return returnObject;
}

vocabulary.allElements = generateAllElements();
vocabulary.allSubCheckboxes = vocabulary.categories
    .map(category => vocabulary.allElements[category])
    .reduce((acc, curr) => acc.concat(curr), []);
vocabulary.mainCheckboxes = [].concat(vocabulary.categories, vocabulary.purposes);

//vocabulary.allSubCheckboxes = [].concat(vocabulary.categories.coo, vocabulary.categories.equ, vocabulary.categories.geo, vocabulary.categories.sfw);
//vocabulary.allElements = Object.assign({},vocabulary.categories, vocabulary.purposes);


export default vocabulary;

