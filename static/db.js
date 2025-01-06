import {getJSON, postJSON, putJSON, modifyNavBar, viewDB, editDB, showError} from "./utils.js"
let baseURL = "";

const sortTable = (index, reverse) => {
    const tableRows = Array.from(document.getElementById("dataTable").children);
    let newRows = [];
    newRows = tableRows.sort((a, b) => {
        if (reverse){
            return Array.from(a.children)[index].innerHTML < Array.from(b.children)[index].innerHTML;
        }
        return Array.from(a.children)[index].innerHTML > Array.from(b.children)[index].innerHTML;
    });
    document.getElementById("dataTable").innerHTML = "";
    newRows.forEach((row) => {
        document.getElementById("dataTable").appendChild(row);
    });   
}

const sortDB = (e) => {
    const sortType = e.target.innerHTML;
    let reverse = false;
    if (typeof e.target.value != "undefined" && e.target.value == "normal"){
        e.target.value = "reverse";
        reverse = true;
    } else {
        e.target.value = "normal";
    }
    switch (sortType){
        case "DB":
            sortTable(0, reverse);
            break;
        case "Card":
            sortTable(1, reverse);
            break;
        case "Name":
            sortTable(2, reverse);
            break;
        case "Variant":
            sortTable(3, reverse);
            break;
        case "Quantity":
            sortTable(4, reverse);
            break;
        case "Inc/Dec":
            showError("I refuse to sort by button");
            break;
        case "Total Estimated Cost":
            sortTable(6, reverse);
            break;
        case "Card ID":    
            sortTable(7, reverse);
            break;
        case "Time Added":
            sortTable(8, reverse);
            break;
        case "Delete?":
            showError("Trash is Trash");
            break;
    };
};

const deleteCard = (e) => {
    const tr = e.target.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    const name = Array.from(tr.children)[2].innerText
    const res = window.confirm(`Are you sure you want to delete the ${variant} ${name} card?`);
    if (res){
        postJSON(`${baseURL}/changeQty`, JSON.stringify({
            id: cardID,
            variant: variant,
            quantity: 0
        })).then((resp) => {
            if (resp['success'] == true){
                loadDB();
            } else {
                showError(resp['err']);
            }
        });
    }
};

const incCard = (e) => {
    const tr = e.target.parentElement.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    let quantity = Number.parseInt(Array.from(tr.children)[4].innerText);
    quantity++;
    postJSON(`${baseURL}/changeQty`, JSON.stringify({
        id: cardID,
        variant: variant,
        quantity: quantity
    })).then((resp) => {
        if (resp['success'] == true){
            loadDB();
        } else {
            showError(resp['err']);
        }
    });
};

const decCard = (e) => {
    const tr = e.target.parentElement.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    let quantity = Number.parseInt(Array.from(tr.children)[4].innerText);
    quantity--;
    postJSON(`${baseURL}/changeQty`, JSON.stringify({
        id: cardID,
        variant: variant,
        quantity: quantity
    })).then((resp) => {
        if (resp['success'] == true){
            loadDB();
        } else {
            showError(resp['err']);
        }
    });
};

const tablePopulation = (element, dbName) => {
    const table = document.getElementById("dataTable");
    const edit = localStorage.getItem("dataEdit");

    const tr = document.createElement("tr");
    let td = document.createElement("td");
    td.innerText = dbName; //localStorage.getItem("selectedDB");
    tr.appendChild(td);
    td = document.createElement("td");
    const img = document.createElement("img");
    img.src = element['img'];
    img.classList.add("cards");
    td.appendChild(img);
    tr.appendChild(td);
    td = document.createElement("td");
    td.innerText = element['name'];
    tr.appendChild(td);
    td = document.createElement("td");
    td.innerText = element['variant'];
    tr.appendChild(td);
    td = document.createElement("td");
    td.innerText = element['quantity'];
    tr.appendChild(td);
    td = document.createElement("td");
    const pmDiv = document.createElement("div");
    pmDiv.classList.add("d-flex", "flex-nowrap", "gap-2", "justify-content-center");
    const incQuanButton = document.createElement("button");
    incQuanButton.classList.add("btn", "btn-primary");
    incQuanButton.onclick = incCard;
    incQuanButton.innerText = "+";
    if (edit !== "true"){
        incQuanButton.disabled = true;
    }
    pmDiv.appendChild(incQuanButton);
    const decQuanButton = document.createElement("button");
    decQuanButton.classList.add("btn", "btn-secondary");
    decQuanButton.onclick = decCard;
    decQuanButton.innerText = "-";
    if (edit !== "true"){
        decQuanButton.disabled = true;
    }
    pmDiv.appendChild(decQuanButton);
    td.appendChild(pmDiv);
    tr.appendChild(td);
    td = document.createElement("td");
    const a = document.createElement("a");
    a.innerText = element['lastCost'];
    a.href = element['priceURL'];
    td.appendChild(a);
    tr.appendChild(td);
    td = document.createElement("td");
    td.innerText = element['id'];
    tr.appendChild(td);
    td = document.createElement("td");
    td.innerText = element['timeAdded'];
    tr.appendChild(td);
    td = document.createElement("td");
    const delButton = document.createElement("button");
    delButton.classList.add('btn', 'btn-danger');
    delButton.innerText = '🗑️';
    delButton.onclick = deleteCard;
    if (edit !== "true"){
        delButton.disabled = true;
    }
    td.appendChild(delButton);
    tr.appendChild(td);
    table.appendChild(tr);
};

const populateTable = (data) => {
    const table = document.getElementById("dataTable");
    table.innerHTML = "";
    if (typeof data.db !== "undefined"){ // Single View
        for (let i = 0; i < data['db'].length; i++){
            tablePopulation(data['db'][i], localStorage.getItem("selectedDB"));
        }
    } else { // All View
        for (let d in data){
            for (let i = 0; i < data[d]['db'].length; i++){
            const tr = document.createElement("tr");
                tablePopulation(data[d]['db'][i], d);
            }
        }
    }
    if (window.location == `${baseURL}/viewNoNav`){
        sortTable( 8, true);
    }
};

const loadDB = () => {
    const allDBs = localStorage.getItem("selectedDBALL");
    const dbName = localStorage.getItem("selectedDB");
    const updatePrice = localStorage.getItem("priceUpdate");
    localStorage.setItem("priceUpdate", "false");
    if (allDBs === "true"){
    postJSON(`${baseURL}/viewDB`, JSON.stringify({})).then((data) => {
            populateTable(data);
        });
    } else {
        postJSON(`${baseURL}/viewDB`, JSON.stringify({
            name: dbName,
            forceUpdate: updatePrice == "true",
        })).then((data) => {
            populateTable(data);
        });
    }
};

window.onload = () => {
    baseURL = window.location.origin;
    if (window.location != `${baseURL}/viewNoNav`){
        modifyNavBar(baseURL, editDB, viewDB);
    }
    const tableHeaders = document.getElementsByTagName("th");
    Array.from(tableHeaders).forEach((th) => {
        th.onclick = sortDB;
    });
    loadDB();
};

window.onclose = () => {
    localStorage.setItem("selectedDB", "None")
}