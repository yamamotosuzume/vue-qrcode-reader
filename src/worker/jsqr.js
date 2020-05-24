const inlineWorker = func => {
  const functionBody = func
    .toString()
    .trim()
    .match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/)[1];

  return new Worker(
    URL.createObjectURL(new Blob([functionBody], { type: "text/javascript" }))
  );
};

export default () => {
  /* eslint-disable no-undef */
  return inlineWorker(function() {
    self.importScripts(
      "https://cdn.jsdelivr.net/npm/jsqr@1.3.1/dist/jsQR.min.js"
    );

    const jsqrDetect = async ({ data, width, height }) => {
      const result = jsQR(data, width, height, {
        inversionAttempts: "dontInvert"
      });

      if (result === null) {
        return {
          content: null,
          location: null
        };
      } else {
        return {
          content: result.data,
          location: result.location
        };
      }
    };

    const nativeDetect = async imageData => {
      const detector = new BarcodeDetector({
        formats: ["qr_code"]
      });

      try {
        const [result] = await detector.detect(imageData);

        if (result === undefined) {
          return {
            content: null,
            location: null
          };
        } else {
          const [
            topLeftCorner,
            topRightCorner,
            bottomRightCorner,
            bottomLeftCorner
          ] = result.cornerPoints;

          return {
            content: result.rawValue,
            location: {
              topLeftCorner,
              topRightCorner,
              bottomRightCorner,
              bottomLeftCorner,

              // not supported by native API
              topRightFinderPattern: {},
              topLeftFinderPattern: {},
              bottomLeftFinderPattern: {}
            }
          };
        }
      } catch (error) {
        console.error("Boo, BarcodeDetection failed: " + error);
      }
    };

    const detect = self.BarcodeDetector === undefined ? jsqrDetect : nativeDetect;

    self.addEventListener("message", async event => {
      const imageData = event.data;

      const { content, location } = await detect(imageData);

      self.postMessage({ content, location, imageData }, [imageData.data.buffer]);
    });
  });
  /* eslint-enable */
};
