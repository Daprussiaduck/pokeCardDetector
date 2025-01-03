import {modifyNavBar, viewDB, editDB} from "./utils.js"

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

const reloadDBs = () => {
    const dbTable = document.getElementById("databases");
    dbTable.innerHTML = "";
    fetch(`${baseURL}/DBs`).then((data) => {
        return data.json();
    }).then((data) => {
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
                dbData.innerText = data.dbs[i].estCost;
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
                let dbDelete = document.createElement("button");
                dbDelete.classList.add('btn', 'btn-danger');
                dbDelete.innerText = '🗑️';
                dbDelete.onclick = deleteDB;
                dbData.appendChild(dbDelete);
                dbRow.appendChild(dbData);
                dbTable.appendChild(dbRow);
            }
        } else {
            console.error("No DataBases returned from server.");
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