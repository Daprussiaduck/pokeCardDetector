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
    // let name = window.prompt("What whould you like the new database file to be named?");
    //console.log(name);
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

    // Make the button in the add new DB modal actuall request a new DB be made
    document.getElementById("btnMakeDB").onclick = addNewDB;

    // Get the list of databases from the servber and populate the list in the nav bar
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