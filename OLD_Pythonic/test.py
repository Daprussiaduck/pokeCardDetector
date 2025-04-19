from OLD_Pythonic.detect import CardDetector
from PIL import Image
import pandas as pd
import numpy as np
import cv2

def detectVideo(capture, detector: CardDetector, display=True, debug=True):
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
                det_cards, fallback = detector.detectFrame(frame)
            if key == ord('n') or key == 83:
                if det_cards is None:
                    det_cards, fallback = detector.detectFrame(frame)
                else:
                    i = i + 1
            if key == ord('p') or key == 81:
                if det_cards is None:
                    det_cards, fallback = detector.detectFrame(frame)
                else:
                    i = i - 1
            if key == 13 or key == ord('a'):
                if det_cards is None:
                    det_cards, fallback = detector.detectFrame(frame)
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
                    newCard = detector.showCard(d, fallback, i)
                    actCards[d] = newCard
            cv2.imshow('Raw', frame)
    except KeyboardInterrupt:
        print('Exiting the program')
        # cards.to_pickle(os.path.join(CacheDir, "CardsDF.pkl"))
        #keepDF.to_excel('cards.xlsx')
        capture.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    det = CardDetector()
    print(det.cardsDF.info())
    #im = Image.open('/home/daprussiaduck/Pictures/Camera/Photo from 2024-12-29 18-57-29.274588.jpeg')
    im = Image.open('/home/daprussiaduck/Pictures/Camera/Photo from 2024-12-30 15-57-28.004640.jpeg')
    #capture = cv2.VideoCapture("/dev/v4l/by-id/usb-046d_HD_Pro_Webcam_C920_77AEF86F-video-index0")
    #detectVideo(capture, det)
    #capture.release()
    detCards, fall = det.detectFrame(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGBA2BGR))
    print(detCards)