/**
 * A stored photo is a data URL (data:image/jpeg;base64,...). Browsers shrink
 * photos to about 20 KB before sending (frontend/src/utils/photo.js); this
 * rejects anything that is not an image or is far larger than that, so one
 * raw 5 MB upload cannot bloat every class list that includes it.
 */
const MAX_PHOTO_BYTES = 400 * 1024;

/** Returns { value } to store (null clears the photo) or { error }. */
function checkPhoto(raw) {
  if (raw === null || raw === '') return { value: null };
  if (typeof raw !== 'string') return { error: 'Photo must be an image.' };
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(raw)) {
    return { error: 'Photo must be a JPG, PNG or WebP image.' };
  }
  if (raw.length > MAX_PHOTO_BYTES * 1.37) { // base64 is ~4/3 the size
    return { error: 'Photo is too large. Upload it again from the app so it is resized first.' };
  }
  return { value: raw };
}

module.exports = { checkPhoto, MAX_PHOTO_BYTES };
