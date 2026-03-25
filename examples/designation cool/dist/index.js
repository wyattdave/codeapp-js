
import { getUserPhoto,getMyProfile } from "././codeapp.js";


/* ── DOM refs ───────────────────────────────────── */
const elLoading      = document.getElementById("loadingScreen");
const elErrorBanner  = document.getElementById("errorBanner");
const elFirstName    = document.getElementById("firstName");
const elJobTitle     = document.getElementById("jobTitle");
const elDepartment   = document.getElementById("attrDepartment");
const elOffice       = document.getElementById("attrOffice");
const elPhotoFallback  = document.getElementById("photoFallback");

/* ── Helpers ────────────────────────────────────── */
const getInitials = (sName) => {
  if (!sName) return "?";
  const aParts = sName.trim().split(/\s+/);
  if (aParts.length >= 2) return (aParts[0][0] + aParts[aParts.length - 1][0]).toUpperCase();
  return aParts[0][0].toUpperCase();
};

const hideLoading = () => {
  elLoading.classList.add("hidden");
};

const showError = (sMsg) => {
  elErrorBanner.textContent = sMsg;
  elErrorBanner.classList.add("visible");
  setTimeout(() => elErrorBanner.classList.remove("visible"), 6000);
};

/* ── Load Profile ───────────────────────────────── */
const loadProfile = async () => {
  try {
    const oProfile = await getMyProfile();

    const sDisplayName = oProfile.DisplayName || oProfile.displayName || "Jack";
    const sFirst = (oProfile.GivenName || oProfile.givenName || sDisplayName.split(" ")[0] || "Jack");
    const sTitle = oProfile.JobTitle || oProfile.jobTitle || "Cool Person";
    const sDept = oProfile.Department || oProfile.department || "Coolness Division";
    const sOffice = oProfile.OfficeLocation || oProfile.officeLocation || oProfile.City || oProfile.city || "Classified";
    const sUPN= oProfile.UserPrincipalName || oProfile.userPrincipalName || "Mystery"
    loadPhoto(sUPN)
    elFirstName.textContent = sFirst;
    elJobTitle.textContent = sTitle;
    elDepartment.textContent = sDept;
    elOffice.textContent = sOffice;
    elPhotoFallback.textContent = getInitials(sDisplayName);
  } catch (oErr) {
    console.error("Profile load failed:", oErr);
    showError("Profile: " + (oErr.message || oErr));
    elJobTitle.textContent = "Cool Person";
  }
};

/* ── Load Photo ─────────────────────────────────── */
const loadPhoto = async (sUPN) => {
  console.log("Loading photo for", sUPN);
  try {
    const oPhotoData = await getUserPhoto(sUPN);

    let sSrc = "";

    if (typeof oPhotoData === "string") {
      // Could be a base64 string or a data URI
      sSrc = oPhotoData.startsWith("data:") ? oPhotoData : "data:image/jpeg;base64," + oPhotoData;
    } else if (oPhotoData instanceof Blob) {
      sSrc = URL.createObjectURL(oPhotoData);
    } else if (oPhotoData && oPhotoData.$content) {
      // SDK sometimes returns { $content-type, $content }
      sSrc = "data:image/jpeg;base64," + oPhotoData.$content;
    } else if (oPhotoData && oPhotoData.body && oPhotoData.body.$content) {
      sSrc = "data:image/jpeg;base64," + oPhotoData.body.$content;
    }

    if (sSrc) {
      const elImg = document.createElement("img");
      elImg.className = "profile-photo";
      elImg.alt = "Your profile photo";
      elImg.src = sSrc;

      // Replace fallback with real photo
      elPhotoFallback.replaceWith(elImg);
    }
  } catch (oErr) {
    // Photo not available — fallback initials remain visible
    console.warn("Photo not available:", oErr.message || oErr);
  }
};

/* ── Boot ───────────────────────────────────────── */
async function boot() {
  try {
    // Load profile and photo in parallel
    await Promise.allSettled([
      loadProfile(),     
    ]);
  } catch (oErr) {
    console.error("Boot error:", oErr);
    showError("Failed to initialize: " + (oErr.message || oErr));
  } finally {
    hideLoading();
  }
}

boot();
