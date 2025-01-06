export function getJSON(url){
    return fetch(url).then((data) => {
        return data.json();
    }).catch((err) => {
        showError(err);
    });
}

export function postJSON(url, bodyData){
    return fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain'
        },
        method: 'POST',
        cache: 'no-cache',
        redirect: 'follow',
        body: bodyData,
    }).then((data) => {
        return data.json();
    }).catch((err) => {
        showError(err);
    });
}

export function putJSON(url, bodyData){
    return fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json, text/plain'
        },
        method: 'PUT',
        cache: 'no-cache',
        redirect: 'follow',
        body: bodyData,
    }).then((data) => {
        return data.json();
    }).catch((err) => {
        showError(err);
    });
}

export function showError(errorMsg){
    console.error(errorMsg);
    document.getElementById("modalErr").innerText = errorMsg;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('errorModalMain'), {}).show();
}

function addNewDB(){
    let name = document.getElementById("txtDBName").value;
    if (name != null && name != ""){
        postJSON(`${window.location.origin}/changeDB`, JSON.stringify({
            name: name,
            new: true
        })).then((resp) => {
            console.log(resp);
            if (typeof resp.success != "undefined" && resp.success == true){
                window.location.href = window.location.href;
                localStorage.setItem("selectedDB", name);
                localStorage.setItem("selectedDBALL", false);
                localStorage.setItem("dataEdit", "true");
            } else {
                showError(resp.err);
            }
        });
    }
}

export function modifyNavBar(baseURL, editClickCallback, viewClickCallback){
    // If the view callback was not passed, just copy it over from the edit callback
    if (typeof viewClickCallback == "undefined"){
        viewClickCallback = editClickCallback;
    }

    // Disable the detector link if not in edit mode 
    if (localStorage.getItem("dataEdit") !== "true"){
        // console.log("disable detector");
        document.getElementById("detectorLink").classList.add("btn-link", "disabled");
    } else {
        document.getElementById("detectorLink").classList.remove("btn-link", "disabled");
    }

    // Set the label of 'Database Selected: .....' to the database local storage says we are looking at
    const selectedDBLabel = document.getElementById("navDatabaseSelected");
    const dbName = localStorage.getItem("selectedDB");
    selectedDBLabel.innerText = `Database Selected: ${dbName}`;
    const editDrop = document.getElementById("dropDownEdit");
    editDrop.innerHTML = "";
    const viewDrop = document.getElementById("dropDownView");
    viewDrop.innerHTML = "";

    // Make the button in the add new DB modal actual request a new DB be made
    document.getElementById("btnMakeDB").onclick = addNewDB;

    // Get the list of databases from the server and populate the list in the nav bar
    getJSON(`${window.location.origin}/DBs`).then((data) => {
        if (typeof data.success == "undefined" || data.success == false){
            showError(data.err);
        }
        if (typeof data.dbs != "undefined"){
            // Load Databases into the lists under view and edit
            for (let i = 0; i < data.dbs.length; i++){
                // Add to edit
                const editLi = document.createElement("li");
                const editLink = document.createElement("a");
                editLink.classList.add("dropdown-item");
                editLink.innerText = data.dbs[i].name;
                editLink.onclick = editClickCallback;
                editLi.appendChild(editLink);
                editDrop.appendChild(editLi);
                
                // Add to view
                const viewLi = document.createElement("li");
                const viewLink = document.createElement("a");
                viewLink.classList.add("dropdown-item");
                viewLink.innerText = data.dbs[i].name;
                viewLink.onclick = viewClickCallback;
                viewLi.appendChild(viewLink);
                viewDrop.appendChild(viewLi);
            }
        } else {
            showError("No DataBases returned from server.");
        }

        // Add 'Add New DB' to end of the edit DB list after a horizontal line 
        let line = document.createElement("hr");
        line.classList.add("dropdown-divider");
        let li = document.createElement("li");
        li.appendChild(line);
        editDrop.appendChild(li);
        line = document.createElement("a");
        line.classList.add("dropdown-item");
        line.innerText = "Add New Database"
        // Show modal for adding a new BD if the user clicks on that option
        line.onclick = () => {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('addNewModal'), {}).show();
        };
        li = document.createElement("li");
        li.appendChild(line);
        editDrop.appendChild(li);
        
        // Add 'View All' to the end of the View DB list after a horizontal line
        line = document.createElement("hr");
        line.classList.add("dropdown-divider");
        li = document.createElement("li");
        li.appendChild(line);
        viewDrop.appendChild(li);
        line = document.createElement("a");
        line.classList.add("dropdown-item");
        line.innerText = "View All Databases"
        // If the user clicks on the view ALL option, then view all databases
        line.onclick = () => {
            localStorage.setItem("selectedDB", "None");
            localStorage.setItem("selectedDBALL", true);
            window.location = `${baseURL}/view`;
        };
        li = document.createElement("li");
        li.appendChild(line);
        viewDrop.appendChild(li);
    });
    document.getElementById("searchButton").onclick = searchCards;
};

export function viewDB(e){
    let tr = e.target.parentElement;
    if (e.target.nodeName == "TR"){
        tr = e.target;
    }
    if (e.target.nodeName == "BUTTON"){
        tr = e.target.parentElement.parentElement;
    }
    if (e.target.nodeName == "A"){
        tr = e.target.parentElement;
    }
    const trName = Array.from(tr.children)[0].innerText;
    // console.log(`Request to view: ${trName}`);
    const selectedDBLabel = document.getElementById("navDatabaseSelected");
    selectedDBLabel.innerText = `Database Selected: ${trName}`;
    localStorage.setItem("selectedDB", trName);
    localStorage.setItem("selectedDBALL", false);
    localStorage.setItem("dataEdit", "false");
    window.location = `${window.location.origin}/view`
};

export function editDB(e){
    let tr = e.target.parentElement;
    if (e.target.nodeName == "TR"){
        tr = e.target;
    }
    if (e.target.nodeName == "BUTTON"){
        tr = e.target.parentElement.parentElement;
    }
    if (e.target.nodeName == "A"){
        tr = e.target.parentElement;
    }
    const trName = Array.from(tr.children)[0].innerText;
    console.log(`Request to edit: ${trName}`);
    const selectedDBLabel = document.getElementById("navDatabaseSelected");
    selectedDBLabel.innerText = `Database Selected: ${trName}`;
    localStorage.setItem("selectedDB", trName);
    localStorage.setItem("selectedDBALL", false);
    localStorage.setItem("dataEdit", "true");
    window.location = `${window.location.origin}/view`
}

export function searchCards(e){
    const accBtn = document.getElementById("actAdd");
    const varLbl = document.getElementById("variantLabel");
    accBtn.onclick = (eee) => {
        putJSON(`${window.location.origin}/addCard`,
            JSON.stringify({
                id: eee.target.value,
                variant: varLbl.value,
                quantity: Number.parseInt(document.getElementById("qtyText").value)
            })
        ).then((dat) => {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).hide();
            if (dat.success === true){
                //const iframe = document.getElementById("view");
                //iframe.src = `${baseURL}/viewNoNav`;
                //clearPhoto();
                //let CardDiv = document.getElementById("detectedCardsDiv");
                //CardDiv.innerHTML = "";
                //let detCardLabel = document.getElementById("detectedCardLabel");
                //detCardLabel.innerText = "No Card Detected";
            } else {
                showError(dat.err);
            }
        });
    };
    let query = document.getElementById("searchBox").value;
    console.log(query);
    if (query.indexOf(":") == -1){
        query = `name:${query}`;
    }
    postJSON(`${window.location.origin}/query`, JSON.stringify({
        query: query
    })).then((data) => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('manualAddModal'), {}).hide();
        if (data.success == true){
            console.log(data.cards);
            const CardDiv = document.getElementById("manualAddDiv");
            for (let i = 0; i < data.cards.length; i++){
                let cardDiv = document.createElement("div");
                cardDiv.classList.add("cards", "card", "center");
                cardDiv.value = data.cards[i].id;
                let cardLabel = document.createElement("h6");
                cardLabel.innerText = `${data.cards[i].name} | ${data.cards[i].set.name}`;
                cardLabel.value = data.cards[i].id;
                cardLabel.cardName = data.cards[i].name;
                cardLabel.onclick = (e) => {
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('manualAddModal'), {}).hide();
                    getJSON(`${window.location.origin}/versions/${e.target.value}`).then((data) => {
                        const list = document.getElementById("variantSelect");
                        list.innerHTML = "";
                        console.log(data);
                        console.log(typeof data)
                        for(let i = 0; i < data.length; i++){
                            const li = document.createElement("li");
                            const a = document.createElement("a");
                            a.classList.add("dropdown-item");
                            a.value = data[i];
                            a.innerText = data[i];
                            const actAddButton = document.getElementById("actAdd");
                            actAddButton.value = e.target.value;
                            a.onclick = (ee) => { // When the Add button in the modal is clicked
                                const label = document.getElementById("variantLabel");
                                label.innerText = `Variant Selected: ${ee.target.value}`;
                                label.value = ee.target.value;
                                const addButton = document.getElementById("actAdd");
                                addButton.disabled = false;
                            };
                            li.appendChild(a);
                            //cameraSelect.appendChild(li);
                            list.appendChild(li);
                        }
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).show();
                    }).catch((err) => {
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).hide();
                        showError(err);
                    });
                };
                cardDiv.appendChild(cardLabel);
                let cardImg = document.createElement("img");
                cardImg.setAttribute("src", data.cards[i].images.large);
                cardImg.value = data.cards[i].id;
                cardImg.cardName = data.cards[i].name;
                cardImg.onclick = (e) => {
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('manualAddModal'), {}).hide();
                    getJSON(`${window.location.origin}/versions/${e.target.value}`).then((data) => {
                        const list = document.getElementById("variantSelect");
                        list.innerHTML = "";
                        console.log(data);
                        console.log(typeof data)
                        for(let i = 0; i < data.length; i++){
                            const li = document.createElement("li");
                            const a = document.createElement("a");
                            a.classList.add("dropdown-item");
                            a.value = data[i];
                            a.innerText = data[i];
                            const actAddButton = document.getElementById("actAdd");
                            actAddButton.value = e.target.value;
                            a.onclick = (ee) => { // When the Add button in the modal is clicked
                                const label = document.getElementById("variantLabel");
                                label.innerText = `Variant Selected: ${ee.target.value}`;
                                label.value = ee.target.value;
                                const addButton = document.getElementById("actAdd");
                                addButton.disabled = false;
                            };
                            li.appendChild(a);
                            //cameraSelect.appendChild(li);
                            list.appendChild(li);
                        }
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).show();
                    }).catch((err) => {
                        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).hide();
                        showError(err);
                    });
                };
                cardDiv.appendChild(cardImg);
                CardDiv.appendChild(cardDiv);
            }
            bootstrap.Modal.getOrCreateInstance(document.getElementById('manualAddModal'), {}).show();
        } else {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('manualAddModal'), {}).hide();
            showError(data.err);
        }
    });
}