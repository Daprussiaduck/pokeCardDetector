import {getJSON, postJSON, putJSON, modifyNavBar, viewDB, editDB, showError} from "./utils.js"
let baseURL = "";
let height = 1920;
let width = 1080;
let streaming = false;
let video = null;
let canvas = null;
let photo = null;
let startButton = null;

// Clears the photo that was shown and sent to the detector
const clearPhoto = () => {
    const context = canvas.getContext("2d");
    context.fillStyle = "#AAA";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
}

// Adds all of the cameras available to the select camera element, must be called after camera is initalized
const enumerateCameras = () => {
    const cameraSelect = document.getElementById("cameraSelect");
    cameraSelect.innerHTML = "";
    navigator.mediaDevices.enumerateDevices().then((devices) => {
        devices.forEach((device) => {
            if (device.kind === "videoinput") {
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

// Switches the camera input to the selected one
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

// Called when a detected card is clicked
// Then asks for variant and Qty in a modal, which will then actually add to the database
const addCard = (e) => {
    getJSON(`${baseURL}/versions/${e.target.value}`).then((data) => {
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
            cameraSelect.appendChild(li);
            list.appendChild(li);
        }
        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).show();
    }).catch((err) => {
        bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).hide();
        showError(err);
    });
};

// Take a snapshot of the webcam feed and send it to the detector to be looked at
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

        postJSON(`${baseURL}/detect`,
            JSON.stringify({
                imgData: data
            })
        ).then((data) => {
            if (typeof data.success != "undefined" && data.success == true){
                if (data.detectedCard && data.fallbackCards.length >= 1){
                    detCardLabel.innerText = `Detected: ${data.detectedCard.name} from: ${data.detectedCard.set}`;
                    for (let row = 0; row < data.fallbackCards.length; row++){
                        for (let card = 0; card < data.fallbackCards[row].length; card++){
                            let cardDiv = document.createElement("div");
                            cardDiv.classList.add("cards", "card", "center");
                            cardDiv.value = data.fallbackCards[row][card].id;
                            let cardLabel = document.createElement("h6");
                            cardLabel.innerText = `${data.fallbackCards[row][card].name} | ${data.fallbackCards[row][card].set.name}`;
                            cardLabel.value = data.fallbackCards[row][card].id;
                            cardLabel.cardName = data.fallbackCards[row][card].name;
                            cardLabel.onclick = addCard;
                            cardDiv.appendChild(cardLabel);
                            let cardImg = document.createElement("img");
                            cardImg.setAttribute("src", data.fallbackCards[row][card].images.large);
                            cardImg.value = data.fallbackCards[row][card].id;
                            cardImg.cardName = data.fallbackCards[row][card].name;
                            cardImg.onclick = addCard;
                            cardDiv.appendChild(cardImg);
                            CardDiv.appendChild(cardDiv);
                        }
                    }
                } else {
                    showError("There are no cards returned to show.");
                }
            } else {
                showError(data.err);
            }
        })
    } else {
        clearPhoto();
    }
}

// Sets up the camera to take pictures of cards
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

// When the window loads
window.onload = () => {
    baseURL = window.location.origin;
    modifyNavBar(baseURL, editDB, viewDB);
    setupCamera();
    const iframe = document.getElementById("view");
    iframe.src = `${baseURL}/viewNoNav`;
    const accBtn = document.getElementById("actAdd");
    const e = document.getElementById("variantLabel");
    accBtn.onclick = (eee) => {
        putJSON(`${baseURL}/addCard`,
            JSON.stringify({
                id: eee.target.value,
                variant: e.value,
                quantity: Number.parseInt(document.getElementById("qtyText").value)
            })
        ).then((dat) => {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('variantSelectModal'), {}).hide();
            if (dat.success === true){
                const iframe = document.getElementById("view");
                iframe.src = `${baseURL}/viewNoNav`;
                clearPhoto();
                let CardDiv = document.getElementById("detectedCardsDiv");
                CardDiv.innerHTML = "";
                let detCardLabel = document.getElementById("detectedCardLabel");
                detCardLabel.innerText = "No Card Detected";
            } else {
                showError(dat.err);
            }
        });
    };
};

window.onclose = () => {
    localStorage.setItem("selectedDB", "None");
}