export function modifyNavBar(baseURL, editClickCallback, viewClickCallback){
    if (typeof viewClickCallback == "undefined"){
        viewClickCallback = editClickCallback;
    }
    const selectedDBLabel = document.getElementById("navDatabaseSelected");
    const dbName = localStorage.getItem("selectedDB");
    selectedDBLabel.innerText = `Database Selected: ${dbName}`;
    const editDrop = document.getElementById("dropDownEdit");
    const viewDrop = document.getElementById("dropDownView");
    editDrop.innerHTML = "";
    viewDrop.innerHTML = "";
    fetch(`${baseURL}/DBs`).then((data) => {
        return data.json();
    }).then((data) => {
        if (data.dbs){
            // Load DBs
            for (let i = 0; i < data.dbs.length; i++){
                const editLi = document.createElement("li");
                const editLink = document.createElement("a");
                editLink.classList.add("dropdown-item");
                editLink.innerText = data.dbs[i].name;
                editLink.onclick = editClickCallback;
                editLi.appendChild(editLink);
                editDrop.appendChild(editLi);

                const viewLi = document.createElement("li");
                const viewLink = document.createElement("a");
                viewLink.classList.add("dropdown-item");
                viewLink.innerText = data.dbs[i].name;
                viewLink.onclick = viewClickCallback;
                viewLi.appendChild(viewLink);
                viewDrop.appendChild(viewLi);
            }
        } else {
            console.error("No DataBases returned from server.");
        }
        let line = document.createElement("hr");
        line.classList.add("dropdown-divider");
        let li = document.createElement("li");
        li.appendChild(line);
        editDrop.appendChild(li);
        line = document.createElement("a");
        line.classList.add("dropdown-item");
        line.innerText = "Add New Database"
        line.onclick = () => {
            let name = window.prompt("What whould you like the new database file to be named?");
            if (name != null && name != ""){
                fetch(`${baseURL}/changeDB`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json, text/plain'
                    },
                    method: 'POST',
                    cache: 'no-cache',
                    redirect: 'follow',
                    body: JSON.stringify({
                        name: name,
                        new: true,
                    }),
                }).then((resp) => {
                    return resp.json();
                }).then((resp) => {
                    if (resp.success !== null && resp.success == true){
                        window.location.href = window.location.href;
                        localStorage.setItem("selectedDB", name);
                        localStorage.setItem("selectedDBALL", false);
                        localStorage.setItem("dataEdit", "true");
                    }
                });
            }
        };
        li = document.createElement("li");
        li.appendChild(line);
        editDrop.appendChild(li);
    
        line = document.createElement("hr");
        line.classList.add("dropdown-divider");
        li = document.createElement("li");
        li.appendChild(line);
        viewDrop.appendChild(li);
        line = document.createElement("a");
        line.classList.add("dropdown-item");
        line.innerText = "View All Databases"
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
    console.log(`Request to view: ${trName}`);
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