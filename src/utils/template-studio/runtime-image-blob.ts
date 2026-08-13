/**
 * Normalizes an arbitrary user-selected image file into a static PNG Blob
 * without ever routing it through a Data URL or string storage. Used for
 * image inputs that have no crop target (the crop modal handles its own
 * canvas conversion for inputs that do).
 */
export const convertStudioRuntimeImageFileToPngBlob = (
  file: File,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || 1;
        canvas.height = image.naturalHeight || 1;
        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("Canvas context is unavailable.");
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error("Failed to encode the image."));
            return;
          }
          resolve(blob);
        }, "image/png");
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load the selected image."));
    };
    image.src = objectUrl;
  });
