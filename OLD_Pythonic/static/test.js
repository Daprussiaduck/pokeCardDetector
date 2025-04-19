import {getJSON, postJSON, putJSON, modifyNavBar, viewDB, editDB} from "./utils.js"

let baseURL = "";

window.onload = () => {
    baseURL = window.location.origin;
    modifyNavBar(baseURL, editDB, viewDB);
}