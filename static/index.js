import {getJSON, postJSON, putJSON, modifyNavBar, viewDB, editDB, showError} from "./utils.js"

let baseURL = "";

const deleteDB = (e) => {
    const tr = e.target.parentElement.parentElement;
    const trName = Array.from(tr.children)[0].innerText
    fetch(`${baseURL}/deleteDB`,{
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain'
        },
        method: 'DELETE',
        cache: 'no-cache',
        redirect: 'follow',
        body: JSON.stringify({
            "name": trName,
        })
    }).then((data) => {
        return data.json();
    }).then((data) => {
        if (data.success && data.success == true){
            reloadDBs();
        } else {
            console.error(data.err);
        }
    });
};

const updatePrices = (e) => {
    const tr = e.target.parentElement.parentElement;
    const trName = Array.from(tr.children)[0].innerText;
    // console.log(`Request to view: ${trName}`);
    const selectedDBLabel = document.getElementById("navDatabaseSelected");
    selectedDBLabel.innerText = `Database Selected: ${trName}`;
    localStorage.setItem("selectedDB", trName);
    localStorage.setItem("selectedDBALL", false);
    localStorage.setItem("dataEdit", "false");
    localStorage.setItem("priceUpdate", "true");
    window.location = `${window.location.origin}/view`
};


const reloadDBs = () => {
    const dbTable = document.getElementById("databases");
    dbTable.innerHTML = "";
    fetch(`${baseURL}/DBs`).then((data) => {
        return data.json();
    }).then((data) => {
        console.log(data)
        if (data.dbs){
            // Load DBs
            for (let i = 0; i < data.dbs.length; i++){
                let dbRow = document.createElement("tr");
                dbRow.ondblclick = viewDB;
                let dbData = document.createElement("td");
                dbData.ondblclick = viewDB;
                dbData.innerText = data.dbs[i].name;
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                dbData.ondblclick = viewDB;
                dbData.innerText = data.dbs[i].numEntries;
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                dbData.ondblclick = viewDB;
                dbData.innerText = data.dbs[i].numCards;
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                dbData.ondblclick = viewDB;
                dbData.innerText = Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(data.dbs[i].estCost);
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                dbData.innerText = "";
                let dbView = document.createElement("button");
                dbView.classList.add('btn', 'btn-outline-info');
                dbView.onclick = viewDB;
                dbView.innerText = "View";
                dbData.appendChild(dbView);
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                dbData.innerText = "";
                let dbUpd = document.createElement("button");
                dbUpd.classList.add('btn', 'btn-outline-info');
                dbUpd.onclick = updatePrices;
                dbUpd.innerText = "Update Prices";
                dbData.appendChild(dbUpd);
                dbRow.appendChild(dbData);
                dbData = document.createElement("td");
                let dbDelete = document.createElement("button");
                dbDelete.classList.add('btn', 'btn-danger');
                dbDelete.innerText = '🗑️';
                dbDelete.onclick = deleteDB;
                dbData.appendChild(dbDelete);
                dbRow.appendChild(dbData);
                dbTable.appendChild(dbRow);
            }
        } else {
            showError("No DataBases returned from server.");
        }
    })
}

window.onload = () => {
    baseURL = window.location.origin;
    modifyNavBar(baseURL, editDB, viewDB);
    reloadDBs();
}

window.onclose = () => {
    localStorage.setItem("selectedDB", "None")
}