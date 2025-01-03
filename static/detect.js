import { modifyNavBar, editDB, viewDB } from "./utils.js"
let baseURL = "";
let height = 1920;
let width = 1080;
let streaming = false;
let video = null;
let canvas = null;
let photo = null;
let startButton = null;

const clearPhoto = () => {
    const context = canvas.getContext("2d");
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
}

const enumerateCameras = () => {
    const cameraSelect = document.getElementById("cameraSelect");
    cameraSelect.innerHTML = "";
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        //console.log('Available input and output devices:', devices);
        devices.forEach((device) => {
            if (device.kind === "videoinput") {
                //console.log(`Video Device: ${device.deviceId}`);
                const a = document.createElement("a");
                a.classList.add("dropdown-item");
                a.value = device.deviceId;
                a.innerText = device.label;
                a.onclick = (e) => {
                    switchCamera(e.target.value);
                };
                const li = document.createElement("li");
                li.appendChild(a);
                cameraSelect.appendChild(li);
            }
          });
    });
};

const switchCamera = (camera) => {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    photo = document.getElementById('photo');
    startButton = document.getElementById('start-button');
    navigator.mediaDevices.getUserMedia({
        video: {
            deviceId: camera != null ? {exact: camera} : undefined,
            facingMode: 'environment'
        },
        audio: false
    }).then((stream) => {
        video.srcObject = stream;
        const streamSettings = stream.getVideoTracks()[0].getSettings();
        width = streamSettings.width;
        height = streamSettings.height;
        video.play();
        enumerateCameras();
    }).catch((err) => {
        console.error(`An error occurred: ${err}`);
    });
};

const addCard = (e) => {
    // console.log(e.target.value)
    fetch(`${baseURL}/versions/${e.target.value}`).then((data) => {
        return data.json();
    }).then((data) => {
        // console.log(data);
        const list = document.getElementById("variantSelect");
        list.innerHTML = "";
        data.forEach((variant) => {
            const li = document.createElement("li");
            const a = document.createElement("a");
            a.classList.add("dropdown-item");
            a.value = variant;
            a.innerText = variant;
            a.onclick = (ee) => {
                const label = document.getElementById("variantLabel");
                label.innerText = `Variant Selected: ${ee.target.value}`;
                const accBtn = document.getElementById("actAdd");
                accBtn.value = ee.target.value;
                accBtn.disabled = false;
                accBtn.onclick = (eee) => {
                    console.log(e.target.value, eee.target.value);
                    fetch(`${baseURL}/addCard`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json, text/plain'
                        },
                        method: 'PUT',
                        cache: 'no-cache',
                        redirect: 'follow',
                        body: JSON.stringify({
                            id: e.target.value,
                            variant: eee.target.value,
                            quantity: Number.parseInt(document.getElementById("qtyText").value)
                        })
                    }).then((dat) => {
                        return dat.json();
                    }).then((dat) => {
                        console.log(dat.success);
                        if (dat.success === true){
                            console.log("hide");
                            const varSelect = bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {});
                            //const varSelect = new bootstrap.Modal(document.getElementById('variantSelectModal'), {});
                            // const table = document.getElementById("dataTable");
                            // const tr = document.createElement("tr");
                            // let td = document.createElement("td");
                            // td.innerText = e.target.cardName;
                            // tr.appendChild(td);
                            // td = document.createElement("td");
                            // td.innerText = eee.target.value;
                            // tr.appendChild(td);
                            // td = document.createElement("td");
                            // td.innerText = Number.parseInt(document.getElementById("qtyText").value);
                            // tr.appendChild(td);
                            varSelect.hide();
                            const iframe = document.getElementById("view");
                            iframe.src = `${baseURL}/view`;
                            clearPhoto();
                            let CardDiv = document.getElementById("detectedCardsDiv");
                            CardDiv.innerHTML = "";
                            let detCardLabel = document.getElementById("detectedCardLabel");
                            detCardLabel.innerText = "No Card Detected";
                        }
                    });
                };
            };
            li.appendChild(a);
            cameraSelect.appendChild(li);
            list.appendChild(li);
        });
        const varSelect = bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {});
        varSelect.show();
    });
};

const takePicture = () => {
    let CardDiv = document.getElementById("detectedCardsDiv");
    CardDiv.innerHTML = "";
    let detCardLabel = document.getElementById("detectedCardLabel");
    detCardLabel.innerText = "No Card Detected";
    const context = canvas.getContext("2d");
    if (width && height) {
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);
        const data = canvas.toDataURL("image/png");
        photo.setAttribute("src", data);
        //console.log(video.srcObject)
        fetch(`${baseURL}/detect`, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json, text/plain'
            },
            method: 'POST',
            cache: 'no-cache',
            redirect: 'follow',
            body: JSON.stringify({
                imgData: data
            })
        }).then((data) => {
            return (data.json());
        }).then((data) => {
            // console.log(data)
            if (data.detectedCard && data.fallbackCards.length >= 1){
                // console.log(`${data.detectedCard.name} from ${data.detectedCard.set}`)
                detCardLabel.innerText = `Detected: ${data.detectedCard.name} from: ${data.detectedCard.set}`;
                for (let row = 0; row < data.fallbackCards.length; row++){
                    // console.log(data.fallbackCards[row])
                    for (let card = 0; card < data.fallbackCards[row].length; card++){
                        //console.log(data.fallbackCards[row][card])
                        let cardDiv = document.createElement("div");
                        cardDiv.classList.add("cards", "card", "center");
                        cardDiv.value = data.fallbackCards[row][card].id;
                        let cardLabel = document.createElement("h6");
                        cardLabel.innerText = `${data.fallbackCards[row][card].name} | ${data.fallbackCards[row][card].setName}`;
                        cardLabel.value = data.fallbackCards[row][card].id;
                        cardLabel.cardName = data.fallbackCards[row][card].name;
                        cardLabel.onclick = addCard;
                        cardDiv.appendChild(cardLabel);
                        let cardImg = document.createElement("img");
                        cardImg.setAttribute("src", data.fallbackCards[row][card].images.large);
                        cardImg.value = data.fallbackCards[row][card].id;
                        cardImg.cardName = data.fallbackCards[row][card].name;
                        cardImg.onclick = addCard;
                        //cardDiv.onclick = addCard;
                        cardDiv.appendChild(cardImg);
                        CardDiv.appendChild(cardDiv);
                    }
                }
            }
        })
    } else {
        clearPhoto();
    }
}

const setupCamera = () => {
    switchCamera();
    video.addEventListener("canplay", (ev) => {
        if (!streaming) {
            //height = (video.videoHeight / video.videoWidth) * width;
            video.setAttribute("width", width);
            video.setAttribute("height", height);
            canvas.setAttribute("width", width);
            canvas.setAttribute("height", height);
            streaming = true;
        }
    }, false,);
    startButton.addEventListener("click", (ev) => { 
        takePicture();
        ev.preventDefault();
    }, false,);
    document.getElementById("detect").addEventListener("click", (ev) => { 
        takePicture();
        ev.preventDefault();
    }, false,);
    clearPhoto();
};

window.onload = () => {
    baseURL = window.location.origin;
    modifyNavBar(baseURL, editDB, viewDB);
    setupCamera();
    const iframe = document.getElementById("view");
    iframe.src = `${baseURL}/viewNoNav`;
};

window.onclose = () => {
    localStorage.setItem("selectedDB", "None");
}