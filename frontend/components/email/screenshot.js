// Screenshots for admin emails, without extra libraries: capture this tab (browser screen share),
// paste an image, or pick a file. Images are shrunk to keep the email small.

const MAX_WIDTH = 1600;
const MAX_FILE = 15 * 1024 * 1024;

function shrink(source, width, height) {
  const scale = Math.min(1, MAX_WIDTH / width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  // Tall full-page shots get a little more compression so the email stays well under 5 MB.
  return canvas.toDataURL("image/jpeg", canvas.height > 4000 ? 0.72 : 0.85);
}

export const canCaptureScreen = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);

/** Asks the browser to share this tab, grabs one frame, and stops sharing at once. */
export async function captureThisTab() {
  if (!canCaptureScreen()) throw new Error("This browser cannot take screenshots. Paste or upload an image instead.");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude",
  });
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    // Give the browser a moment to drop its "sharing" banner and draw the page.
    await new Promise((resolve) => setTimeout(resolve, 400));
    return shrink(video, video.videoWidth, video.videoHeight);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}

const MAX_HEIGHT = 9000;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/** Pinned things (side menu, top bar, floating buttons) that would repeat in every part of a long shot. */
function pinnedElements() {
  return [...document.body.querySelectorAll("*")].filter((el) => {
    const position = getComputedStyle(el).position;
    return (position === "fixed" || position === "sticky") && el.getBoundingClientRect().height > 0;
  });
}

/**
 * The whole page, not just the part on screen: shares this tab once, scrolls down step by step,
 * grabs each part and joins them. The side menu and top bar show once, at the top.
 */
export async function captureFullPage() {
  if (!canCaptureScreen()) throw new Error("This browser cannot take screenshots. Paste or upload an image instead.");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { displaySurface: "browser" }, audio: false, preferCurrentTab: true, selfBrowserSurface: "include", surfaceSwitching: "exclude",
  });
  const startY = window.scrollY;
  const root = document.documentElement;
  const smooth = root.style.scrollBehavior;
  const hidden = [];
  root.style.scrollBehavior = "auto";
  try {
    const video = document.createElement("video");
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    await pause(400);
    const view = window.innerHeight;
    const scale = video.videoWidth / window.innerWidth;
    const total = Math.min(root.scrollHeight, Math.floor(MAX_HEIGHT / scale));
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = Math.round(total * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < total; y += view) {
      window.scrollTo(0, y);
      await frame();
      await pause(250);
      const actual = window.scrollY;
      const height = Math.min(view, total - actual);
      if (height <= 0) break;
      ctx.drawImage(video, 0, 0, video.videoWidth, height * scale, 0, actual * scale, video.videoWidth, height * scale);
      if (actual + view >= total) break;
      if (y === 0) {
        // After the first part, hide pinned things so they do not repeat down the image.
        for (const el of pinnedElements()) { hidden.push([el, el.style.visibility]); el.style.visibility = "hidden"; }
      }
    }
    return shrink(canvas, canvas.width, canvas.height);
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    for (const [el, value] of hidden) el.style.visibility = value;
    window.scrollTo(0, startY);
    root.style.scrollBehavior = smooth;
  }
}

/** An image file or pasted image → a small JPEG data URL. */
export function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type)) { reject(new Error("Choose an image file.")); return; }
    if (file.size > MAX_FILE) { reject(new Error("That image is too large.")); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(shrink(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(url); };
    img.onerror = () => { reject(new Error("That image could not be opened.")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}

export const pastedImage = (event) => [...(event.clipboardData?.items || [])].find((item) => item.type.startsWith("image/"))?.getAsFile() || null;
