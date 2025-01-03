import { modifyNavBar, editDB, viewDB } from "./utils.js";
let baseURL = "";

const deleteCard = (e) => {
    const tr = e.target.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    const name = Array.from(tr.children)[2].innerText
    const res = window.confirm(`Are you sure you want to delete the ${variant} ${name} card?`);
    if (res){
        fetch(`${baseURL}/changeQty`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain'
            },
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            body: JSON.stringify({
                id: cardID,
                variant: variant,
                quantity: 0
            }),
        }).then((data) => {
            return data.json();
        }).then((resp) => {
            console.log(resp);
            if (resp['success'] == true){
                loadDB();
            }
        });
    }
};

const incCard = (e) => {
    const tr = e.target.parentElement.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    let quantity = Number.parseInt(Array.from(tr.children)[4].innerText);
    // console.log(cardID, variant, quantity);
    quantity++;
    console.log(cardID, variant, quantity);
    fetch(`${baseURL}/changeQty`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain'
        },
        method: 'POST',
        cache: 'no-cache',
        redirect: 'follow',
        body: JSON.stringify({
            id: cardID,
            variant: variant,
            quantity: quantity
        }),
    }).then((data) => {
        return data.json();
    }).then((resp) => {
        console.log(resp);
        if (resp['success'] == true){
            loadDB();
        }
    });
};

const decCard = (e) => {
    const tr = e.target.parentElement.parentElement.parentElement;
    const cardID = Array.from(tr.children)[7].innerText;
    const variant = Array.from(tr.children)[3].innerText;
    let quantity = Number.parseInt(Array.from(tr.children)[4].innerText);
    // console.log(cardID, variant, quantity);
    quantity--;
    console.log(cardID, variant, quantity);
    fetch(`${baseURL}/changeQty`, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain'
        },
        method: 'POST',
        cache: 'no-cache',
        redirect: 'follow',
        body: JSON.stringify({
            id: cardID,
            variant: variant,
            quantity: quantity
        }),
    }).then((data) => {
        return data.json();
    }).then((resp) => {
        console.log(resp);
        if (resp['success'] == true){
            loadDB();
        }
    });
};

const populateTable = (data) => {
    //console.log(typeof data['db']);
    const table = document.getElementById("dataTable");
    table.innerHTML = "";
    const edit = localStorage.getItem("dataEdit");
    console.log(edit, typeof edit, edit !== "true")
    if (typeof data.db !== "undefined"){ // Single View
        const db = data['db'];
            for (let i = 0; i < db.length; i++){
            const tr = document.createElement("tr");
                let td = document.createElement("td");
                td.innerText = localStorage.getItem("selectedDB");
                tr.appendChild(td);
                td = document.createElement("td");
                const img = document.createElement("img");
                img.src = data['db'][i]['img'];
                img.classList.add("cards");
                td.appendChild(img);
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data['db'][i]['name'];
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data['db'][i]['variant'];
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data['db'][i]['quantity'];
                tr.appendChild(td);
                td = document.createElement("td");
                //td.classList.add("d-grid", "gap-2", "d-md-block", "justify-content-center");
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
                
                //td.innerText = 'plus/minus';
                td.appendChild(pmDiv);
                tr.appendChild(td);
                td = document.createElement("td");
                const a = document.createElement("a");
                a.innerText = data['db'][i]['lastCost'];
                a.href = data['db'][i]['priceURL'];
                td.appendChild(a);
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data['db'][i]['id'];
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
            }
    } else { // All View
        for (let d in data){
            //console.log(d);
            const db = data[d]['db'];
            for (let i = 0; i < db.length; i++){
            const tr = document.createElement("tr");
                let td = document.createElement("td");
                td.innerText = d;
                tr.appendChild(td);
                td = document.createElement("td");
                const img = document.createElement("img");
                img.src = data[d]['db'][i]['img'];
                img.classList.add("cards");
                td.appendChild(img);
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data[d]['db'][i]['name'];
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data[d]['db'][i]['variant'];
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data[d]['db'][i]['quantity'];
                tr.appendChild(td);
                td = document.createElement("td");
                //td.classList.add("d-grid", "gap-2", "d-md-block", "justify-content-center");
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
                
                //td.innerText = 'plus/minus';
                td.appendChild(pmDiv);
                tr.appendChild(td);
                td = document.createElement("td");
                //td.innerText = data[d]['db'][i]['lastCost'];
                const a = document.createElement("a");
                a.innerText = data[d]['db'][i]['lastCost'];
                a.href = data[d]['db'][i]['priceURL'];
                td.appendChild(a);
                tr.appendChild(td);
                td = document.createElement("td");
                td.innerText = data[d]['db'][i]['id'];
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
            }
        }
    }
};

const loadDB = () => {
    const allDBs = localStorage.getItem("selectedDBALL");
    const dbName = localStorage.getItem("selectedDB");
    //console.log(`All: ${allDBs}, name: ${dbName}`);
    //console.log(allDBs);
    if (allDBs === "true"){
        fetch(`${baseURL}/viewDB`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain'
            },
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            body: JSON.stringify({}),
        }).then((data) => {
            return (data.json());
        }).then((data) => {
            // console.log(`f ${data}`)
            populateTable(data);
        });
    } else {
        fetch(`${baseURL}/viewDB`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain'
            },
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            body: JSON.stringify({
                name: dbName
            })
        }).then((data) => {
            return (data.json());
        }).then((data) => {
            //console.log(`fuck ${data}`)
            populateTable(data);
        });
    }
};

window.onload = () => {
    baseURL = window.location.origin;
    if (window.location != `${baseURL}/viewNoNav`){
        modifyNavBar(baseURL, editDB, viewDB);
    }
    loadDB();
};

window.onclose = () => {
    localStorage.setItem("selectedDB", "None")
}