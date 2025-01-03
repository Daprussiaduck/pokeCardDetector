from detect import CardDetector
from PIL import Image
import numpy as np
import base64
import flask
import cv2
import io
import os

app = flask.Flask(__name__)
detector = CardDetector()

def stringToImage(base64_string):
    imgdata = base64.b64decode(base64_string)
    return Image.open(io.BytesIO(imgdata))

@app.route("/")
@app.route("/index.html")
def index():
    return flask.render_template('index.html')

@app.route("/detect", methods=["GET", "POST"])
def detectCard():
    if flask.request.method == "GET":
        return flask.render_template('detect.html')
    if flask.request.method == "POST":
        data = flask.request.get_json()
        if 'imgData' in data.keys():
            ret, img = cv2.VideoCapture(data['imgData']).read()
            cv2.waitKey(10)
            detCards, fallbackCards = detector.detectFrame(img)
            fallCards = []
            if len(detCards) > 0:
                for d in detCards:
                    troll = []
                    print(fallbackCards[d])
                    for fall in fallbackCards[d].index:
                        troll.append(detector.getCardJSON(fall))
                    fallCards.append(troll)
                return {
                    "success": True,
                    "detectedCard": {
                        "name": detCards[0][0],
                        "set": detCards[0][1],
                    },
                    "fallbackCards": fallCards
                }
            return {
                "success": False,
                "err": "No Cards detected",
                "detectedCard": {},
                "fallbackCards": {}
            }
        return {
            "success": False,
            "err": "No image data in the POST request"}

@app.route("/DBs")
def getDBs():
    return {"dbs": detector.getDBs()}

@app.route("/changeDB", methods=["POST"])
def changeDB():
    data = flask.request.get_json()
    ret = False
    if not data is None:
        new = False
        if not "name" in data.keys():
            return {"success": False, "err": "no name for database to load"}
        if not data["name"].endswith(".xlsx"):
            data["name"] = data["name"] + ".xlsx"
        if "new" in data.keys():
            new = data["new"]
        ret = detector.changeDB(data['name'], new)
    return {"success": ret}

@app.route("/view")
def view():
    return flask.render_template('db.html')

@app.route("/viewNoNav")
def viewNoNav():
    return flask.render_template('viewNoNav.html')

@app.route("/viewDB", methods=["POST"])
def viewDB():
    data = flask.request.get_json()
    if not data is None:
        if "name" in data.keys():
            if not data["name"].endswith(".xlsx"):
               data["name"] = data["name"] + ".xlsx"
            if not detector.changeDB(data["name"], False):
                return {
                    "success": False,
                    "err": "Database specified doesn't exist"
                }
            return detector.getAddDB()
        else:
            dbList = detector.getDBList()
            ret = {}
            for db in dbList:
                detector.changeDB(db, False)
                ret[db] = detector.getAddDB()
            return ret
    return {
        "success": False,
        "err": "No JSON data was sent"
    }

@app.route("/getDB")
def getDB():
    return detector.getAddDB()

@app.route("/deleteDB", methods=["DELETE"])
def deleteDB():
    data = flask.request.get_json()
    if not data is None and not data["name"] is None:
        return detector.deleteDB(data["name"])
    return {
        "success": False,
        "err": "No database selected to be deleted"
        }

@app.route("/addCard", methods=["PUT"])
def addCardToDB():
    data = flask.request.get_json()
    if "id" in data.keys() and "quantity" in data.keys() and "variant" in data.keys():
        print(data)
        return detector.addCardToDB(data['id'], data['quantity'], data['variant'])    
    return {
        "success": False,
        "err": "The proper keys were not found in the given data"}

@app.route("/versions/<string:cardID>")
def getCardVersions(cardID):
    return detector.getCardVersions(cardID)

@app.route("/price/<string:cardID>")
def getCardPrice(cardID):
    version = flask.request.args.get("version")
    if version is None:
        return {
            "success": "Failure: Version was not specified"
        }
    price = detector.getCardPrice(cardID, version)
    if price is None:
        return {
            "success": "Failure: Not a valid card version for specified card ID"
        }
    return {"price": price}

@app.route("/priceURL/<string:cardID>")
def getPriceURL(cardID):
    return {"url": detector.getPriceURL(cardID)}

@app.route("/changeQty", methods=["POST"])
def changeQuantity():
    data = flask.request.get_json()
    if not data is None:
        # print(data)
        if "id" in data.keys() and "variant" in data.keys() and "quantity" in data.keys():
            if data['quantity'] == 0:
                return detector.removeCard(data['id'], data['variant'])
            return detector.modCard(data['id'], data['quantity'], data['variant'])
        return {
            "success": False,
            "err": "The keys required were not found"}
    return {
        "success": False,
        "err": "No JSON data found"}