from pokemontcgsdk import Card
from pokemontcgsdk import Set
import multiprocessing as mp
import imagehash as ih
from PIL import Image
import pandas as pd
import numpy as np
import subprocess
import datetime
import requests
import math
import cv2
import os

class CardDetector:
    """
    Class containing all of the necessary methods for detecting a pokemon card from an image.
    Able to be fine tuned, but most parameters are ok for detection by default.
    """

    def __init__(self, imageDir='./CardImages', cacheDir='./CardCache', dbDir="./CardDBs", hashSize = 64, numFreq=16, cThresh=5, sizeThresh=10000, kernelSize=(3,3)):
        """
        Initializes the Card Detector, able to modify most internal values if desired.
        dataDir: Directory in which the git repo (https://github.com/PokemonTCG/pokemon-tcg-data) will be locally cloned [Default: './pokemon-tcg-data']
        imageDir: Directory where the images provided by the pokemon-tcg-data data is locally stored (they are too large to be cached like the hashes, and no need to get them again if need to recompute the hash) [Default: './CardImages']
        cacheDir: Directory where to store the calculated hashes for each card to lower subsequent load times after the initial build, wiping this directory causes a full rebuild. [Default: './CardsCache']
        hashSize: One component of the hash size, the other is the number of high frequencies (numFreq) [Default: 64]
        numFreq: one component of the hash size, the other being the 'hashSize' [Default: 16]
        cThresh: The threshold for detecting contours [Default: 5]
        sizeThresh: The threshold for the size of the card to detect [Default: 10000]
        kernelSize: The size of the kernel to detect with [Default: (3, 3)]
        """
        # Caching Directories
        self.ImagesDir = imageDir
        self.CacheDir = cacheDir
        # Database Directory/path and object to "store" it
        self.DBDir = dbDir
        self.DBPath = None
        self.addDB = None
        # Parameters of the Card Detection Algorithm
        self.hashSize = hashSize
        self.numFreq = numFreq
        self.cThresh = cThresh
        self.sizeThresh = sizeThresh
        self.kernelSize = kernelSize
        # Load in the data (update the cache, and the load the cache)
        self.cardsDF = None
        if os.path.exists(os.path.join(self.CacheDir, "cardsDF.pkl")):
            self.cardsDF = pd.read_pickle(os.path.join(self.CacheDir, "cardsDF.pkl"))
        self.updateSets()
        print("sets updated")
        self.loadSets()
        print('sets loaded')
        print("ready to detect")

    def updateSets(self):
        sets = Set.all() # Pull new Sets List
        setsDF = pd.DataFrame(vars(set) for set in sets) # Convert to pandas dataframe
        self.updatedCards = []
        if os.path.exists(os.path.join(self.CacheDir, "setsDF.pkl")): # If we have a cache, check it
            oldSets = pd.read_pickle(os.path.join(self.CacheDir, "setsDF.pkl"))
            latestUpdate = oldSets['updatedAt'].max()
            if latestUpdate < setsDF['updatedAt'].max():
                # We updated
                updatedSets = setsDF[self.setsDF['updatedAt'] > latestUpdate]
                updatedSets.apply(lambda x: self.updateSet(x), axis = 1)
        else: # No old (we have no cache)
            setsDF.apply(lambda x: self.updateSet(x), axis = 1)
        setsDF.to_pickle(os.path.join(self.CacheDir, "setsDF.pkl"))
        self.threadedGetImagesStart(self.updatedCards, False)
    
    def updateSet(self, set:pd.DataFrame):
        print("updating set:", set['id'])
        cards = []
        i = 1
        ret = Card.where(q='set.id:' + set['id'], page=i, pageSize=250)
        while ret:
        #for i in range(math.ceil(set['total']/250)):
        #    ret = Card.where(q='set.id:' + set['id'], page=(i + 1), pageSize=250)
            for card in ret:
                cards.append(card)
                self.updatedCards.append(card)
            if self.cardsDF is None:
                self.cardsDF = pd.DataFrame(vars(card) for card in cards)
            else:
                # self.cardsDF = pd.concat([pd.read_pickle(os.path.join(self.CacheDir, "cardsDF.pkl")), pd.DataFrame(vars(card) for card in cards)])
                self.cardsDF = pd.concat([self.cardsDF, pd.DataFrame(vars(card) for card in cards)]).drop_duplicates(['id'], keep="last")
            self.cardsDF.set_index(['id'], drop=False, inplace=True)
            self.cardsDF.to_pickle(os.path.join(self.CacheDir, "cardsDF.pkl"))
            i = i + 1
            ret = Card.where(q='set.id:' + set['id'], page=i, pageSize=250)
        

    def loadSets(self):
        setsDF = pd.read_pickle(os.path.join(self.CacheDir, "setsDF.pkl"))
        if not os.path.exists(os.path.join(self.CacheDir, "imgDF.pkl")):
            setsDF.apply(lambda x: self.loadSet(x), axis = 1)
        imgHashColName = "hash_" + str(self.hashSize) + ":" + str(self.numFreq)
        imgDF = pd.read_pickle(os.path.join(self.CacheDir, "imgDF.pkl"))
        imgDF.apply(lambda x: self.applyHashtoCardsDF(x['id'], x[imgHashColName]), axis = 1)
        #self.cardsDF['hash'] = imgDF[self.cardsDF['id'] == imgDF['id']][imgHashColName]

    def loadSet(self, set):
        print("loading set", set['name'])
        imgHashColName = "hash_" + str(self.hashSize) + ":" + str(self.numFreq)
        imgDF = None if not os.path.exists(os.path.join(self.CacheDir, "imgDF.pkl")) else pd.read_pickle(os.path.join(self.CacheDir, "imgDF.pkl"))
        setDF = pd.read_pickle(os.path.join(self.CacheDir, "Sets", set['id'] + "_IMG.pkl"))
        #setDF.apply(lambda x: self.applyHashtoCardsDF(x['id'], x[imgHashColName]), axis = 1)
        if imgDF is None:
            imgDF = setDF
        else:
            imgDF = pd.concat([imgDF, setDF]).drop_duplicates(['id'], keep="last")
        imgDF.to_pickle(os.path.join(self.CacheDir, "imgDF.pkl"))
        
    def applyHashtoCardsDF(self, id, hashValue):
        self.cardsDF.at[id, 'hash'] = hashValue
        self.cardsDF.at[id, 'hash_diff'] = hashValue

    def threadedGetImagesStart(self, cards, force):
        # Multithreaded support
        mp.set_start_method("spawn", force = True)
        context = mp.get_context('spawn')
        mrMan = context.Manager()
        dataQueue = mrMan.Queue()
        for card in cards:
            dataQueue.put(card)
        retLock = mrMan.Lock()
        threads = {}
        if not os.path.exists(os.path.join(self.CacheDir, "Sets")):
            os.makedirs(os.path.join(self.CacheDir, "Sets"))
        print("Start of Thread pooling with", dataQueue.qsize(), "cards and", min(mp.cpu_count(), dataQueue.qsize()), "threads")
        for i in range(min(mp.cpu_count(), dataQueue.qsize())):
            threads[i] = context.Process(
                target=self.getImages,
                args=(force, i, dataQueue, retLock),
            )
            threads[i].start()
        print("Waiting for threads to complete")
        for t in threads.keys():
            threads[t].join()

    def getImages(self, force, threadID: int, dataQueue, retLock):
        print("Starting Thread:", threadID, "with", dataQueue.qsize(), "cards to process")
        while not dataQueue.empty():
            card = dataQueue.get()
            self.getImage(card, force, retLock)

    def getImage(self, card: Card, force, retLock):
        card = vars(card)
        setInfo = vars(card['set'])
        imgPath = os.path.join(self.ImagesDir, setInfo['series'], setInfo['name'], card['id'] + " ("  + card['name'] + ").png")
        imgDF = None
        imgDFPath = os.path.join(self.CacheDir, "Sets", setInfo['id'] + "_IMG.pkl")
        imgHashColName = "hash_" + str(self.hashSize) + ":" + str(self.numFreq)
        with retLock:
            if os.path.exists(imgDFPath):
                imgDF = pd.read_pickle(imgDFPath)
        if (imgDF is None) or (not card['id'] in imgDF['id']) or (imgHashColName in imgDF.columns) or pd.isna(imgDF.at[card['id'], imgHashColName]):
            if not os.path.exists(imgPath) or force:
                imgURL = card['images'].large
                imgReqResp = requests.get(imgURL, stream=True)
                img = Image.open(imgReqResp.raw)
                img.save(imgPath)
            else:
                img = Image.open(imgPath)
            img = img.convert('RGBA')
            hash = ih.phash(img, hash_size=self.hashSize, highfreq_factor=self.numFreq)
            data = {
                'id': [card['id']],
                imgHashColName: [hash]
            }
            newDF = pd.DataFrame(data)
            if imgDF is None:
                imgDF = newDF
            else:
                imgDF = pd.concat([imgDF, newDF]).drop_duplicates(['id'], keep="last")
            with retLock:
                if os.path.exists(imgDFPath):
                    pd.concat([pd.read_pickle(imgDFPath), imgDF.dropna()]).drop_duplicates(['id'], keep="last").to_pickle(imgDFPath)
                else:
                    imgDF.to_pickle(imgDFPath)


    def order_points(self, pts):
        """
        Taken from: https://github.com/hj3yoo/mtg_card_detector/blob/master/opencv_dnn.py


        initialize a list of coordinates that will be ordered such that the first entry in the list is the top-left,
        the second entry is the top-right, the third is the bottom-right, and the fourth is the bottom-left
        :param pts: array containing 4 points
        :return: ordered list of 4 points
        """
        rect = np.zeros((4, 2), dtype="float32")

        # the top-left point will have the smallest sum, whereas
        # the bottom-right point will have the largest sum
        s = pts.sum(axis=1)
        rect[0] = pts[np.argmin(s)]
        rect[2] = pts[np.argmax(s)]

        # now, compute the difference between the points, the
        # top-right point will have the smallest difference,
        # whereas the bottom-left will have the largest difference
        diff = np.diff(pts, axis=1)
        rect[1] = pts[np.argmin(diff)]
        rect[3] = pts[np.argmax(diff)]

        # return the ordered coordinates
        return rect

    def four_point_transform(self, image, pts):
        """
        Taken from: https://github.com/hj3yoo/mtg_card_detector/blob/master/opencv_dnn.py

        Transform a quadrilateral section of an image into a rectangular area
        From: www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
        :param image: source image
        :param pts: 4 corners of the quadrilateral
        :return: rectangular image of the specified area
        """
        # obtain a consistent order of the points and unpack them
        # individually
        rect = self.order_points(pts)
        (tl, tr, br, bl) = rect

        # compute the width of the new image, which will be the
        # maximum distance between bottom-right and bottom-left
        # x-coordinates or the top-right and top-left x-coordinates
        widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
        widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
        maxWidth = max(int(widthA), int(widthB))

        # compute the height of the new image, which will be the
        # maximum distance between the top-right and bottom-right
        # y-coordinates or the top-left and bottom-left y-coordinates
        heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
        heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
        maxHeight = max(int(heightA), int(heightB))

        # now that we have the dimensions of the new image, construct
        # the set of destination points to obtain a "birds eye view",
        # (i.e. top-down view) of the image, again specifying points
        # in the top-left, top-right, bottom-right, and bottom-left
        # order
        dst = np.array([
            [0, 0],
            [maxWidth - 1, 0],
            [maxWidth - 1, maxHeight - 1],
            [0, maxHeight - 1]], dtype="float32")

        # compute the perspective transform matrix and then apply it
        mat = cv2.getPerspectiveTransform(rect, dst)
        warped = cv2.warpPerspective(image, mat, (maxWidth, maxHeight))

        # If the image is horizontally long, rotate it by 90
        if maxWidth > maxHeight:
            center = (maxHeight / 2, maxHeight / 2)
            mat_rot = cv2.getRotationMatrix2D(center, 270, 1.0)
            warped = cv2.warpAffine(warped, mat_rot, (maxHeight, maxWidth))

        # return the warped image
        return warped

    def findCard(self, frame):
        """
        Taken from: https://github.com/hj3yoo/mtg_card_detector/blob/master/opencv_dnn.py
        """
        # Typical pre-processing - grayscale, blurring, thresholding
        img_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        img_blur = cv2.medianBlur(img_gray, 5)
        img_thresh = cv2.adaptiveThreshold(img_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 5, self.cThresh)
        # Dilute the image, then erode them to remove minor noises
        kernel = np.ones(self.kernelSize, np.uint8)
        img_dilate = cv2.dilate(img_thresh, kernel, iterations=1)
        img_erode = cv2.erode(img_dilate, kernel, iterations=1)
        counts, hierarchy = cv2.findContours(img_erode, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        if len(counts) == 0:
            #print('no contours')
            return []
        counts_rect = []
        stack = [(0, hierarchy[0][0])]
        while len(stack) > 0:
            # print("stack:", len(stack))
            i_cnt, h = stack.pop()
            i_next, i_prev, i_child, i_parent = h
            if i_next != -1:
                stack.append((i_next, hierarchy[0][i_next]))
            cnt = counts[i_cnt]
            size = cv2.contourArea(cnt)
            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
            if size >= self.sizeThresh and len(approx) == 4:
                counts_rect.append(approx)
            else:
                if i_child != -1:
                    stack.append((i_child, hierarchy[0][i_child]))
        return counts_rect

    def remove_glare(self, img):
        """
        Taken from: https://github.com/hj3yoo/mtg_card_detector/blob/master/opencv_dnn.py

        Reduce the effect of glaring in the image
        Inspired from:
        http://www.amphident.de/en/blog/preprocessing-for-automatic-pattern-identification-in-wildlife-removing-glare.html
        The idea is to find area that has low saturation but high value, which is what a glare usually look like.
        :param img: source image
        :return: corrected image with glaring smoothened out
        """
        img_hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        _, s, v = cv2.split(img_hsv)
        non_sat = (s < 32) * 255  # Find all pixels that are not very saturated

        # Slightly decrease the area of the non-saturated pixels by a erosion operation.
        disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        non_sat = cv2.erode(non_sat.astype(np.uint8), disk)

        # Set all brightness values, where the pixels are still saturated to 0.
        v[non_sat == 0] = 0
        # filter out very bright pixels.
        glare = (v > 200) * 255

        # Slightly increase the area for each pixel
        glare = cv2.dilate(glare.astype(np.uint8), disk)
        glare_reduced = np.ones((img.shape[0], img.shape[1], 3), dtype=np.uint8) * 200
        glare = cv2.cvtColor(glare, cv2.COLOR_GRAY2BGR)
        corrected = np.where(glare, glare_reduced, img)
        return corrected

    def detectFrame(self, img, display=False, debug=False):
        """
        Modified from: https://github.com/hj3yoo/mtg_card_detector/blob/master/opencv_dnn.py
        """
        imgRes = img.copy()
        # detect the cards
        det_cards = []
        detectedFallbackCards = {}
        counts = self.findCard(imgRes)
        print("Found %d cards" % len(counts))
        for i in range(len(counts)):
            cnt = counts[i]
            # For the region of the image covered by the contour, transform them into a rectangular image
            pts = np.float32([p[0] for p in cnt])
            img_warp = self.four_point_transform(img, pts)
            img_card = Image.fromarray(img_warp.astype('uint8'), 'RGB')
            # the stored values of hashes in the dataframe is preemptively flattened already to minimize computation time
            # identify the cards
            card_hash = ih.phash(img_card, hash_size=self.hashSize, highfreq_factor=self.numFreq)
            self.cardsDF['hash_diff'] = self.cardsDF['hash']
            #print("Card Hash", card_hash)
            self.cardsDF['hash_diff'] = self.cardsDF['hash_diff'].apply(lambda x: x - card_hash)
            #print("Found Cards:", cards[~cards['hash_diff']])
            #min_card = cards[~cards['hash_diff']]
            min_card = self.cardsDF[self.cardsDF['hash_diff'] == self.cardsDF['hash_diff'].min()].iloc[0]
            #print(min_card)
            #print(cards['hash_diff'].min())
            #print("cummin", cards['hash_diff'].cummin())
            #print("eq:", min_card['hash'] == card_hash)
            card_name = min_card['name']
            card_set = min_card['set'].name
            det_cards.append((card_name, card_set))
            hashDiffMinThreshold = ((self.cardsDF['hash_diff'].max() - self.cardsDF['hash_diff'].min())/10) + self.cardsDF['hash_diff'].min()
            #print("Diff", hashDiffMinThreshold)
            #print(self.cardsDF['hash_diff'].sort_values().head())
            detectedFallbackCards[(card_name, card_set)] = self.cardsDF[self.cardsDF['hash_diff'] < hashDiffMinThreshold]['hash_diff']
            #print(detectedFallbackCards[(card_name, card_set)])
            hash_diff = min_card['hash_diff']

            # Render the result, and display them if needed
            cv2.drawContours(imgRes, [cnt], -1, (0, 255, 0), 2)
            cv2.putText(imgRes, card_name + ", " + card_set, (int(min(pts[0][0], pts[1][0])), int(min(pts[0][1], pts[1][1]))),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
            if debug:
                #askCards(cards[cards['hash_diff'] == cards['hash_diff'].min()])
                # cv2.rectangle(img_warp, (22, 47), (294, 249), (0, 255, 0), 2)
                cv2.putText(img_warp, card_name + ', ' + str(hash_diff), (0, 20),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
                cv2.imshow('card#%d' % i, img_warp)
                imgCard = Image.open(os.path.join(self.ImagesDir, min_card['setSeries'], min_card['setName'], min_card['id'] + " (" + card_name + ").png"))
                imgCard = imgCard.resize((400, 560))
                cv2.imshow('projected card#%d' % i, cv2.cvtColor(np.asarray(imgCard), cv2.COLOR_BGR2RGB))
        if display:
            cv2.imshow('Result', imgRes)
            cv2.waitKey(1)
        return det_cards, detectedFallbackCards

    def showCard(self, detCard, fallback, i):
        fallbackCard = fallback[detCard].sort_values()
        newCard = self.cardsDF[self.cardsDF['id'] == fallbackCard.index[i]].iloc[0]
        imgCard = Image.open(os.path.join(self.ImagesDir, newCard['setSeries'], newCard['setName'], newCard['id'] + " (" + newCard['name'] + ").png"))
        imgCard = imgCard.resize((400, 560))
        cv2.imshow('attempt: ' + str(detCard), cv2.cvtColor(np.asarray(imgCard), cv2.COLOR_BGR2RGB))
        return newCard

    def showCards(self, detCards, fallback, i):
        newCards = []
        for d in detCards:
            self.showCard(d, fallback, i)
        return newCards

    def getCard(self, cardID):
        return self.cardsDF[self.cardsDF['id'] == cardID]

    def getCardJSON(self, cardID):
        card = self.cardsDF[self.cardsDF['id'] == cardID]
        #print(card)
        ret = {}
        for key in card.keys():
            if not key == 'images':
                if key == 'set':
                    ret[key] = vars(card.at[cardID, key])
                else:
                    ret[key] = str(card.at[cardID, key])
            else:
                ret[key] = {
                    'small': card.at[cardID, key].small,
                    'large': card.at[cardID, key].large,
                }
        #print(ret)
        return ret
    
    def getPriceURL(self, cardID):
        #card = Card.where(q="id:" + cardID)
        card = self.getCard(cardID)
        if len(card) != 1:
            return ["ID " + cardID + " returned multiple cards, this should not happen"]
        return card.iloc[0].tcgplayer.url

    def getCardVersions(self, cardID):
        card = self.getCard(cardID)
        if len(card) != 1:
            return ["ID " + cardID + " returned multiple cards, this should not happen"]
        if card.iloc[0].tcgplayer.prices == None: # this should only be for energies
            return ["normal", "holofoil", "reverseHolofoil"]
        priceInfo = card.iloc[0].tcgplayer.prices
        versions = []
        if not priceInfo.normal is None:
            versions.append("normal")
        if not priceInfo.holofoil is None:
            versions.append("holofoil")
        if not priceInfo.reverseHolofoil is None:
            versions.append("reverseHolofoil")
        if not priceInfo.firstEditionHolofoil is None:
            versions.append("firstEditionHolofoil")
        if not priceInfo.firstEditionNormal is None:
            versions.append("firstEditionNormal")
        return versions

    def getCardPrice(self, cardID, version='normal'):
        card = self.cardsDF[self.cardsDF['id'] == cardID]
        if len(card) != 1:
            return ["ID " + cardID + " returned multiple cards, this should not happen"]
        if card.iloc[0].tcgplayer.prices == None: # this should only be for energies
            return 0.0
        priceInfo = card.iloc[0].tcgplayer.prices
        if version == "normal":
            return priceInfo.normal.market
        if version == "holofoil":
            return priceInfo.holofoil.market
        if version == "reverseHolofoil":
            return priceInfo.reverseHolofoil.market
        if version == "firstEditionHolofoil":
            return priceInfo.firstEditionHolofoil.market
        if version == "firstEditionNormal":
            return priceInfo.firstEditionNormal.market
        return None
    
    def getDBList(self):
        return [os.path.join(f) for (dirpath, dirnames, filenames) in os.walk(self.DBDir) for f in filenames if f.endswith(".xlsx")]

    def getDBs(self):
        dbList = self.getDBList()
        dbArr = []
        for db in dbList:
            df = pd.read_excel(os.path.join(self.DBDir, db))
            dbArr.append({
                "name": db,
                "numEntries": len(df.index),
                "estCost": df['lastCost'].sum()
            })
        return dbArr
    
    def deleteDB(self, dbName):
        if os.path.exists(os.path.join(self.DBDir, dbName)):
            if not self.DBPath is None and self.DBPath == os.path.join(self.DBDir, dbName):
                self.DBPath = None
                self.addDB = None
            os.remove(os.path.join(self.DBDir, dbName))
            return {"success": True}
        return {
            "success": False,
            "err": "Database that was requested to be deleted does not exist."
            }
    
    def changeDB(self, newDB, addNew=False):
        if os.path.exists(os.path.join(self.DBDir, newDB)):
            self.DBPath = os.path.join(self.DBDir, newDB)
            self.addDB = pd.read_excel(self.DBPath, index_col=0)
            return True
        if addNew:
            self.DBPath = os.path.join(self.DBDir, newDB)
            self.addDB = None
            return True
        return False
    
    def addCardToDB(self, cardID, quantity, variant):
        if self.DBPath is None or self.DBPath == "":
            return {
                "success": False,
                "err": "No Database selected to add to"
                }
        if self.addDB is None:
            if quantity <= 0:
                return {
                    "success": False,
                    "err": "Cannot add negative or 0 cards to database"
                    }
            if not variant in self.getCardVersions(cardID):
                return {
                    "success": False,
                    "err": "variant is not a real variant for card"
                    }
            lastCost = self.getCardPrice(cardID, variant)
            self.addDB = pd.DataFrame({
                "index": [(cardID, variant)],
                "id": [cardID],
                "Quantity": [quantity],
                "variant": [variant],
                "lastCost": [lastCost],
                "priceURL": self.getPriceURL(cardID),
                "timeAdded": datetime.datetime.now()
            })
            self.addDB.set_index(['index'], inplace=True)
            self.addDB.to_excel(self.DBPath)
            return {"success": True}
        if quantity <= 0:
                return {
                    "success": False,
                    "err": "Cannot add negative or 0 cards to database"
                    }
        if not variant in self.getCardVersions(cardID):
            return {
                "success": False,
                "err": "variant is not a real variant for card"
            }
        lastCost = self.getCardPrice(cardID, variant)
        self.addDB = pd.concat([self.addDB, pd.DataFrame({
                "index": [(cardID, variant)],
                "id": cardID,
                "Quantity": [quantity],
                "variant": [variant],
                "lastCost": [lastCost],
                "priceURL": self.getPriceURL(cardID),
                "timeAdded": datetime.datetime.now()
            }).set_index(['index'])])
        #self.addDB.set_index(['index'], inplace=True)
        self.addDB.to_excel(self.DBPath)
        return {"success": True}
    
    def updatePrice(self, cardID, variant):
        card = self.addDB.loc[(self.addDB['id'] == cardID) & (self.addDB['variant'] == variant)].index.item()
        #print(card)
        lastCost = self.getCardPrice(cardID, variant)
        self.addDB.at[card, 'lastCost'] = lastCost
        self.addDB.to_excel(self.DBPath)

    def getAddDB(self):
        if self.DBPath is None or self.DBPath == "":
            return {
                "success": False,
                "err": "No Database selected to add to"
                }
        if self.addDB is None:
            return {"db": []}
        self.addDB.apply(lambda x: self.updatePrice(x['id'], x['variant']), axis = 1)
        dbArr = []
        self.addDB.apply(lambda x: dbArr.append({
            "id": x['id'],
            "name": self.cardsDF.at[x['id'], 'name'],
            "img": self.cardsDF.at[x['id'], 'images'].large, 
            "quantity": x['Quantity'],
            "variant": x['variant'],
            "lastCost": x['lastCost'] * x['Quantity'],
            "priceURL": x['priceURL'],
            "timeAdded": x['timeAdded']
        }), axis = 1)
        return {"db": dbArr}

    def modCard(self, cardID, quantity, variant):
        if self.DBPath is None or self.DBPath == "":
            return {
                "success": False,
                "err": "No Database selected to add to"
                }
        if self.addDB is None:
            return {
                "success": False,
                "err": "No Database to add to"
            }
        card = self.addDB.loc[(self.addDB['id'] == cardID) & (self.addDB['variant'] == variant)].index.item()
        #print(card)
        self.addDB.at[card, 'Quantity'] = quantity
        self.addDB.to_excel(self.DBPath)
        return {"success": True}
    
    def removeCard(self, cardID, variant):
        if self.DBPath is None or self.DBPath == "":
            return {
                "success": False,
                "err": "No Database selected to add to"
                }
        if self.addDB is None:
            return {
                "success": False,
                "err": "No Database to add to"
            }
        card = self.addDB.loc[(self.addDB['id'] == cardID) & (self.addDB['variant'] == variant)].index.item()
        # print(card)
        self.addDB.drop(card, inplace=True)
        # print(self.addDB.head())
        self.addDB.to_excel(self.DBPath)
        return {"success": True}