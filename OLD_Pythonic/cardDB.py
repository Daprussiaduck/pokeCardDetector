from pokemontcgsdk import Card
from pokemontcgsdk import Set
from pokemontcgsdk import Type
from pokemontcgsdk import Supertype
from pokemontcgsdk import Subtype
from pokemontcgsdk import Rarity
import multiprocessing as mp
import imagehash as ih
from PIL import Image
import pandas as pd
import numpy as np
import subprocess
import requests
import cv2
import os

ImagesDir = './CardImages'
tcgDataDir = 'pokemon-tcg-data'
CacheDir = './CardCache'

def updateGit():
    pwd = os.getcwd()
    if not os.path.exists(tcgDataDir):
        proc = subprocess.Popen(["git clone https://github.com/PokemonTCG/pokemon-tcg-data.git", tcgDataDir], shell=True)
        retVal = proc.wait()
    else:
        os.chdir(tcgDataDir)
        proc = subprocess.Popen("git pull", shell = True, stdout=subprocess.PIPE)
        retVal = proc.wait()
        output = proc.stdout.read()
        # print("output:", output)
        os.chdir(pwd)
        if output == b'Already up to date.\n':
            return False
    return True

def loadDB(hashSize=64, numFreq=16):
    if not os.path.exists(CacheDir):
        os.makedirs(CacheDir)
    if updateGit() or not os.path.exists(os.path.join(CacheDir, 'CardsDF.pkl')): # if Updated
        # Update and save Set information
        # print(os.getcwd())
        setsDF = pd.read_json(os.path.join(tcgDataDir, "sets", "en.json"))
        setsDF.set_index('id', inplace=True)
        setsDF.to_pickle(os.path.join(CacheDir, 'SetsDF.pkl'))
        cardsDF = None
        imgDF = None
        for (root, dirs, files) in os.walk(os.path.join(tcgDataDir, "cards", "en")):
            numSets = len(files)
            i = 0
            for file in files:
                i = i + 1
                setID = file.split(".json")[0]
                print("Starting update of:", setID, "set", i, "of", numSets)
                path = os.path.join(root, file)
                setDF = pd.read_json(path)
                setDF.set_index('id', inplace=True, drop=False)
                setDF['setID'] = file.split(".json")[0]
                setDF['setSeries'] = setsDF.loc[setID, 'series']
                setDF['setName'] = setsDF.loc[setID, 'name']
                if os.path.exists(os.path.join(CacheDir, 'sets', setID + '.pkl')):
                    old = pd.read_pickle(os.path.join(CacheDir, 'sets', setID + '.pkl'))
                    if not old.equal(setDF):
                        setDF.to_pickle(os.path.join(CacheDir, 'sets', setID + '.pkl'))
                        updateImages(setID, setDF, hashSize=hashSize, numFreq=numFreq)
                if cardsDF is None:
                    cardsDF = setDF
                else:
                    cardsDF = pd.concat([cardsDF, setDF])
                setImgDF = updateImages(setID, setDF, hashSize=hashSize, numFreq=numFreq)
                if imgDF is None:
                    imgDF = setImgDF
                else:
                    imgDF = pd.concat([imgDF, setImgDF])
                print('Completed update of:', setID, "set", i, "of", numSets, "adding", len(setDF.index), 'cards for a total of', len(imgDF.index), 'cards')
        cardsDF.to_pickle(os.path.join(CacheDir, 'CardsDF.pkl'))
        imgDF.to_pickle(os.path.join(CacheDir, 'ImgDF.pkl'))
        return (cardsDF, setsDF, imgDF)
    else: # if not updated
        cardsDF = pd.read_pickle(os.path.join(CacheDir, 'CardsDF.pkl'))
        setsDF = pd.read_pickle(os.path.join(CacheDir, 'SetsDF.pkl'))
        imgDF = pd.read_pickle(os.path.join(CacheDir, "ImgDF.pkl"))
        if not 'hash_%d' % hashSize in imgDF.columns:
            print("hash not found", hashSize)
            imgDF = updateAllImages(cardsDF, hashSize, numFreq)
        return (cardsDF, setsDF, imgDF)

def updateImageMulti(card, retLock, hashSize=64, numFreq=16):
    imgDF = None
    with retLock:
        if os.path.exists(os.path.join(CacheDir, card['setID'] + '_IMG.pkl')):
            #print("loaded imgDF to check for card", card['id'])
            imgDF = pd.read_pickle(os.path.join(CacheDir, card['setID'] + '_IMG.pkl'))
    if (imgDF is None) or (not card['id'] in imgDF['id'].values):
        #print("not found:", card['id'])
        if not os.path.exists(os.path.join(ImagesDir, card['setSeries'], card['setName'], card['id'] + " (" + card['name'] + ").png")):
            imageURL = card['images']['large']
            imgReqResp = requests.get(imageURL, stream=True)
            img = Image.open(imgReqResp.raw)
        else:
            img = Image.open(os.path.join(ImagesDir, card['setSeries'], card['setName'], card['id'] + " (" + card['name'] + ").png"))
        img = img.convert('RGBA')
        hash = ih.phash(img, hashSize, numFreq)
        data = {
            'id': [card['id']],
            #'img': [img],
            'hash_%d' % hashSize: [hash]
        }
        newDF = pd.DataFrame.from_dict(data)
        newDF.set_index('id', inplace=True, drop=False)
        if imgDF is None:
            imgDF = newDF
        else:
            with retLock:
                imgDF = pd.concat([pd.read_pickle(os.path.join(CacheDir, card['setID'] + '_IMG.pkl')), newDF]).drop_duplicates(['id'])
    else:
        with retLock:
            imgDF = pd.read_pickle(os.path.join(CacheDir, card['setID'] + '_IMG.pkl'))
        if (not ('hash_%d' % hashSize) in imgDF.columns) or (pd.isna(imgDF.at[card['id'], 'hash_%d' % hashSize])):
            print('Hashing with new size of:', hashSize, "for", card['id'])
            if not os.path.exists(os.path.join(ImagesDir, card['setSeries'], card['setName'], card['id'] + " (" + card['name'] + ").png")):
                imageURL = card['images']['large']
                imgReqResp = requests.get(imageURL, stream=True)
                img = Image.open(imgReqResp.raw)
            else:
                img = Image.open(os.path.join(ImagesDir, card['setSeries'], card['setName'], card['id'] + " (" + card['name'] + ").png"))
            img = img.convert('RGBA')
            hash = ih.phash(img, hashSize, numFreq)
            imgDF.at[card['id'], 'hash_%d' % hashSize] = hash
    with retLock:
        if os.path.exists(os.path.join(CacheDir, card['setID'] + '_IMG.pkl')):
    #        flag = 'exists'
            pd.concat([pd.read_pickle(os.path.join(CacheDir, card['setID'] + "_IMG.pkl")), imgDF.dropna()]).drop_duplicates(['id'], keep='last').to_pickle(os.path.join(CacheDir, card['setID'] + "_IMG.pkl"))
        else:
            imgDF.to_pickle(os.path.join(CacheDir, card['setID'] + "_IMG.pkl"))
    #print("saved to", flag, "imgDF, adding", card['id'])

def updateImagesMulti(id, cards: mp.Queue, retLock, hashSize=64, numFreq=16):
    print("Starting Thread:", id, "with", cards.qsize(), 'cards to process')
    while not cards.empty():
        #with retLock:
        card = cards.get()
        #print(card)
        #print("Thread", id, "pulled card", card['id'], "with", cards.qsize(), "cards left")
        updateImageMulti(card, retLock, hashSize, numFreq)
        #print("Thread", id, "finished card", card['id'])


def updateImages(setID, cardsDF, hashSize=64, numFreq=16):
    mp.set_start_method("spawn", force = True)
    context = mp.get_context('spawn')
    mrMan = context.Manager()
    dataQueue = mrMan.Queue()
    retLock = mrMan.Lock()
    threads = {}
    cardsDF.apply(lambda x: dataQueue.put(x), axis = 1)
    #print('qq', dataQueue.qsize())
    #print(dataQueue.qsize())
    print("Start of Thread pooling with", dataQueue.qsize(), 'cards')
    for i in range(min(mp.cpu_count(), dataQueue.qsize())):
        threads[i] = context.Process(
            target=updateImagesMulti,
            args=(i, dataQueue, retLock, hashSize, numFreq)
        )
        threads[i].start()
    print("Waiting for Threads to complete")
    for t in threads.keys():
        threads[t].join()
    imgDF = pd.read_pickle(os.path.join(CacheDir, setID + '_IMG.pkl'))
    return imgDF

def updateAllImages(cardsDF, hashSize=64, numFreq=16):
    mp.set_start_method("spawn", force = True)
    context = mp.get_context('spawn')
    mrMan = context.Manager()
    dataQueue = mrMan.Queue()
    retLock = mrMan.Lock()
    threads = {}
    sets = set()
    cardsDF.apply(lambda x: dataQueue.put(x), axis = 1)
    cardsDF.apply(lambda x: sets.add(x['setID']), axis = 1)
    #print('qq', dataQueue.qsize())
    #print(dataQueue.qsize())
    print("Start of Thread pooling with", dataQueue.qsize(), 'cards')
    for i in range(min(mp.cpu_count(), dataQueue.qsize())):
        threads[i] = context.Process(
            target=updateImagesMulti,
            args=(i, dataQueue, retLock, hashSize, numFreq)
        )
        threads[i].start()
    print("Waiting for Threads to complete")
    for t in threads.keys():
        threads[t].join()
    imgDF = pd.read_pickle(os.path.join(CacheDir, 'ImgDF.pkl'))
    for s in sets:
        print("reading info for set:", s)
        setDF = pd.read_pickle(os.path.join(CacheDir, s + "_IMG.pkl"))
        imgDF = pd.concat([imgDF, setDF]).drop_duplicates('id', keep='last')
        imgDF.to_pickle(os.path.join(CacheDir, "ImgDF.pkl"))
    return imgDF

def order_points(pts):
    """
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

def four_point_transform(image, pts):
    """
    Transform a quadrilateral section of an image into a rectangular area
    From: www.pyimagesearch.com/2014/08/25/4-point-opencv-getperspective-transform-example/
    :param image: source image
    :param pts: 4 corners of the quadrilateral
    :return: rectangular image of the specified area
    """
    # obtain a consistent order of the points and unpack them
    # individually
    rect = order_points(pts)
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

def findCard(frame, cThresh=5, sizeThresh=10000, kernelSize=(3,3)):
    # Typical pre-processing - grayscale, blurring, thresholding
    img_gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    img_blur = cv2.medianBlur(img_gray, 5)
    img_thresh = cv2.adaptiveThreshold(img_blur, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 5, cThresh)
    # Dilute the image, then erode them to remove minor noises
    kernel = np.ones(kernelSize, np.uint8)
    img_dilate = cv2.dilate(img_thresh, kernel, iterations=1)
    img_erode = cv2.erode(img_dilate, kernel, iterations=1)
    counts, hierarchy = cv2.findContours(img_erode, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    if len(counts) == 0:
        #print('no contours')
        return []
    counts_rect = []
    stack = [(0, hierarchy[0][0])]
    while len(stack) > 0:
        i_cnt, h = stack.pop()
        i_next, i_prev, i_child, i_parent = h
        if i_next != -1:
            stack.append((i_next, hierarchy[0][i_next]))
        cnt = counts[i_cnt]
        size = cv2.contourArea(cnt)
        peri = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, 0.04 * peri, True)
        if size >= sizeThresh and len(approx) == 4:
            counts_rect.append(approx)
        else:
            if i_child != -1:
                stack.append((i_child, hierarchy[0][i_child]))
    return counts_rect

def remove_glare(img):
    """
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

def detectFrame(img, cards, hashSize=32, numFreq=4, sizeThresh=10000, display=True, debug=True):
    imgRes = img.copy()
    # detect the cards
    det_cards = []
    detectedFallbackCards = {}
    counts = findCard(imgRes, sizeThresh=sizeThresh)
    for i in range(len(counts)):
        cnt = counts[i]
        # For the region of the image covered by the contour, transform them into a rectangular image
        pts = np.float32([p[0] for p in cnt])
        img_warp = four_point_transform(img, pts)
        img_card = Image.fromarray(img_warp.astype('uint8'), 'RGB')
        # the stored values of hashes in the dataframe is preemptively flattened already to minimize computation time
        # identify the cards
        card_hash = ih.phash(img_card, hashSize, numFreq)
        cards['hash_diff'] = cards['hash']
        #print("Card Hash", card_hash)
        cards['hash_diff'] = cards['hash_diff'].apply(lambda x: x - card_hash)
        #print("Found Cards:", cards[~cards['hash_diff']])
        #min_card = cards[~cards['hash_diff']]
        min_card = cards[cards['hash_diff'] == cards['hash_diff'].min()].iloc[0]
        #print(min_card)
        #print(cards['hash_diff'].min())
        #print("cummin", cards['hash_diff'].cummin())
        #print("eq:", min_card['hash'] == card_hash)
        card_name = min_card['name']
        card_set = min_card['setName']
        det_cards.append((card_name, card_set))
        detectedFallbackCards[(card_name, card_set)] = cards['hash_diff']
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
            imgCard = Image.open(os.path.join(ImagesDir, min_card['setSeries'], min_card['setName'], min_card['id'] + " (" + card_name + ").png"))
            imgCard = imgCard.resize((400, 560))
            cv2.imshow('projected card#%d' % i, cv2.cvtColor(np.asarray(imgCard), cv2.COLOR_BGR2RGB))
    if display:
        cv2.imshow('Result', imgRes)
        cv2.waitKey(1)
    return det_cards, detectedFallbackCards

def showCard(cards, detCard, fallback, i):
    fallbackCard = fallback[detCard].sort_values()
    newCard = cards[cards['id'] == fallbackCard.index[i]].iloc[0]
    imgCard = Image.open(os.path.join(ImagesDir, newCard['setSeries'], newCard['setName'], newCard['id'] + " (" + newCard['name'] + ").png"))
    imgCard = imgCard.resize((400, 560))
    cv2.imshow('attempt: ' + str(detCard), cv2.cvtColor(np.asarray(imgCard), cv2.COLOR_BGR2RGB))
    return newCard

def showCards(cards, detCards, fallback, i):
    newCards = []
    for d in detCards:
        showCard(cards, d, fallback, i)
    return newCards


def detectVideo(capture, cards, keepDF, hashSize=32, numFreq=4, sizeThresh=10000, display=True, debug=True):
    try:
        det_cards = None
        fallback = None
        i = 0
        actCards = {}
        while True:
            ret, frame = capture.read()
            key = cv2.waitKey(1)
            #print('Pressed: ', key)
            if key == 27 or key == ord('q'):
                raise KeyboardInterrupt('Escape the detection')
            if key == ord(' '):
                det_cards, fallback = detectFrame(frame, cards, hashSize, numFreq, display=display, debug=debug)
            if key == ord('n') or key == 83:
                if det_cards is None:
                    det_cards, fallback = detectFrame(frame, cards, hashSize, numFreq, display=display, debug=debug)
                else:
                    i = i + 1
            if key == ord('p') or key == 81:
                if det_cards is None:
                    det_cards, fallback = detectFrame(frame, cards, hashSize, numFreq, display=display, debug=debug)
                else:
                    i = i - 1
            if key == 13 or key == ord('a'):
                if det_cards is None:
                    det_cards, fallback = detectFrame(frame, cards, hashSize, numFreq, display=display, debug=debug)
                else:
                    for d in det_cards:
                        print('add', d, actCards[d])
                        cv2.destroyWindow('attempt: ' + str(d))
                        num = 1
                        if actCards[d]['id'] in keepDF.index:
                            keepDF.at[actCards[d]['id'], 'quantity'] = keepDF.at[actCards[d]['id'], 'quantity'] + 1
                        else:
                            ret = {'id': [actCards[d]['id']],
                                   'quantity': [num]}
                            ret = pd.DataFrame(ret)
                            ret = ret.set_index('id', drop=False)
                            keepDF = pd.concat([keepDF, ret])
                    det_cards = None
            if not det_cards is None:
                for d in det_cards:
                    newCard = showCard(cards, d, fallback, i)
                    actCards[d] = newCard
            cv2.imshow('Raw', frame)
    except KeyboardInterrupt:
        print('Exiting the program')
        cards.to_pickle(os.path.join(CacheDir, "CardsDF.pkl"))
        keepDF.to_excel('cards.xlsx')
        capture.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    #sizes = [16, 32, 64, 128, 256, 512, 1024, 2048]
    #for hashSize in sizes:
    #   cardsDF, setsDF, imgDF = loadDB(hashSize)
    #    if 'hash_%d'%hashSize in imgDF.columns and np.all(pd.notna(imgDF['hash_%d'%hashSize])):
    #        print('Correct', hashSize)
    #    else:
    #        print('Failed', hashSize)
    #if os.path.exists('cards.xlsx'):
    #    keepCardsDF = pd.read_excel('cards.xlsx')
    #else:
    keepCardsDF = pd.DataFrame()
    hashSize = 64
    numFreq = 16
    cardsDF, setsDF, imgDF = loadDB(hashSize, numFreq)
    cardsDF['hash'] = imgDF['hash_%d' % hashSize]
    print("Capturing Video")
    capture = cv2.VideoCapture("/dev/v4l/by-id/usb-046d_HD_Pro_Webcam_C920_77AEF86F-video-index0")
    detectVideo(capture, cardsDF, keepDF=keepCardsDF, hashSize=hashSize, display=False, debug=False)
    capture.release()
