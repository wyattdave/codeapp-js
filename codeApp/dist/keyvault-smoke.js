import {
  callKeyVaultOperation,
  decryptData,
  decryptDataWithVersion,
  enableDebugger,
  encryptData,
  encryptDataWithVersion,
  getKeyMetadata,
  getKeyVersionMetadata,
  getSecret,
  getSecretMetadata,
  getSecretVersion,
  getSecretVersionMetadata,
  listKeys,
  listKeyVersions,
  listSecrets,
  listSecretVersions,
} from "./codeapp.js";

const oElements = {
  eStatusLine: document.getElementById("statusLine"),
  eSecretCount: document.getElementById("secretCount"),
  eKeyCount: document.getElementById("keyCount"),
  eLastActionLabel: document.getElementById("lastActionLabel"),
  eOutputPanel: document.getElementById("outputPanel"),
  eSecretNameInput: document.getElementById("secretNameInput"),
  eSecretVersionInput: document.getElementById("secretVersionInput"),
  eKeyNameInput: document.getElementById("keyNameInput"),
  eKeyVersionInput: document.getElementById("keyVersionInput"),
  eAlgorithmSelect: document.getElementById("algorithmSelect"),
  eUseVersionCheckbox: document.getElementById("useVersionCheckbox"),
  eRawDataInput: document.getElementById("rawDataInput"),
  eEncryptedDataInput: document.getElementById("encryptedDataInput"),
  eEnableDebuggerButton: document.getElementById("enableDebuggerButton"),
  eClearOutputButton: document.getElementById("clearOutputButton"),
  eListSecretsButton: document.getElementById("listSecretsButton"),
  eListSecretVersionsButton: document.getElementById("listSecretVersionsButton"),
  eGetSecretButton: document.getElementById("getSecretButton"),
  eGetSecretMetadataButton: document.getElementById("getSecretMetadataButton"),
  eListKeysButton: document.getElementById("listKeysButton"),
  eListKeyVersionsButton: document.getElementById("listKeyVersionsButton"),
  eGetKeyMetadataButton: document.getElementById("getKeyMetadataButton"),
  eEncryptButton: document.getElementById("encryptButton"),
  eDecryptButton: document.getElementById("decryptButton"),
};

const oState = {
  bDebuggerEnabled: false,
};

function setStatus(sMessage, sTone) {
  oElements.eStatusLine.textContent = sMessage;
  oElements.eStatusLine.className = "status-line " + (sTone || "pending");
}

function setLastAction(sLabel) {
  oElements.eLastActionLabel.textContent = sLabel || "None";
}

function formatOutput(oValue) {
  try {
    return JSON.stringify(oValue, null, 2);
  } catch (oError) {
    return String(oValue);
  }
}

function renderOutput(sAction, oPayload) {
  oElements.eOutputPanel.textContent = formatOutput({
    action: sAction,
    timestamp: new Date().toISOString(),
    payload: oPayload,
  });
}

function getSecretName() {
  return String(oElements.eSecretNameInput.value || "").trim();
}

function getSecretVersion() {
  return String(oElements.eSecretVersionInput.value || "").trim();
}

function getKeyName() {
  return String(oElements.eKeyNameInput.value || "").trim();
}

function getKeyVersion() {
  return String(oElements.eKeyVersionInput.value || "").trim();
}

function getAlgorithm() {
  return String(oElements.eAlgorithmSelect.value || "RSA-OAEP-256");
}

function getRawData() {
  return String(oElements.eRawDataInput.value || "");
}

function getEncryptedData() {
  return String(oElements.eEncryptedDataInput.value || "");
}

function shouldUseVersion() {
  return !!oElements.eUseVersionCheckbox.checked;
}

function requireValue(sLabel, sValue) {
  if (!sValue) {
    throw new Error(sLabel + " is required for this smoke test.");
  }
}

function setSecretCount(iCount) {
  oElements.eSecretCount.textContent = String(iCount || 0);
}

function setKeyCount(iCount) {
  oElements.eKeyCount.textContent = String(iCount || 0);
}

function extractArrayCount(oResult) {
  if (Array.isArray(oResult)) return oResult.length;
  if (oResult && Array.isArray(oResult.value)) return oResult.value.length;
  return 0;
}

async function runAction(sLabel, fnAction) {
  setStatus(sLabel + " running...", "pending");
  setLastAction(sLabel);

  try {
    const oResult = await fnAction();
    renderOutput(sLabel, oResult);
    setStatus(sLabel + " succeeded.", "success");
    return oResult;
  } catch (oError) {
    const sMessage = oError && oError.message ? oError.message : String(oError);
    renderOutput(sLabel, { error: sMessage });
    setStatus(sLabel + " failed: " + sMessage, "error");
    throw oError;
  }
}

async function handleListSecrets() {
  const oResult = await runAction("List secrets", () => listSecrets());
  setSecretCount(extractArrayCount(oResult));
}

async function handleListSecretVersions() {
  const sSecretName = getSecretName();
  requireValue("Secret name", sSecretName);

  const oResult = await runAction("List secret versions", () => listSecretVersions(sSecretName));
  setSecretCount(extractArrayCount(oResult));
}

async function handleGetSecret() {
  const sSecretName = getSecretName();
  const sSecretVersion = getSecretVersion();
  requireValue("Secret name", sSecretName);

  const oResult = await runAction(sSecretVersion ? "Get secret version" : "Get secret", () => {
    if (sSecretVersion) {
      return getSecretVersion(sSecretName, sSecretVersion);
    }
    return getSecret(sSecretName);
  });

  if (oResult && oResult.value) {
    oElements.eRawDataInput.value = String(oResult.value);
  }
}

async function handleGetSecretMetadata() {
  const sSecretName = getSecretName();
  const sSecretVersion = getSecretVersion();
  requireValue("Secret name", sSecretName);

  await runAction(sSecretVersion ? "Get secret version metadata" : "Get secret metadata", () => {
    if (sSecretVersion) {
      return getSecretVersionMetadata(sSecretName, sSecretVersion);
    }
    return getSecretMetadata(sSecretName);
  });
}

async function handleListKeys() {
  const oResult = await runAction("List keys", () => listKeys());
  setKeyCount(extractArrayCount(oResult));
}

async function handleListKeyVersions() {
  const sKeyName = getKeyName();
  requireValue("Key name", sKeyName);

  const oResult = await runAction("List key versions", () => listKeyVersions(sKeyName));
  setKeyCount(extractArrayCount(oResult));
}

async function handleGetKeyMetadata() {
  const sKeyName = getKeyName();
  const sKeyVersion = getKeyVersion();
  requireValue("Key name", sKeyName);

  await runAction(sKeyVersion ? "Get key version metadata" : "Get key metadata", () => {
    if (sKeyVersion) {
      return getKeyVersionMetadata(sKeyName, sKeyVersion);
    }
    return getKeyMetadata(sKeyName);
  });
}

async function handleEncrypt() {
  const sKeyName = getKeyName();
  const sKeyVersion = getKeyVersion();
  const sRawData = getRawData();
  requireValue("Key name", sKeyName);
  requireValue("Plain text", sRawData);

  const oInput = {
    algorithm: getAlgorithm(),
    rawData: sRawData,
  };

  const oResult = await runAction(shouldUseVersion() ? "Encrypt data with version" : "Encrypt data", () => {
    if (shouldUseVersion()) {
      requireValue("Key version", sKeyVersion);
      return encryptDataWithVersion(sKeyName, sKeyVersion, oInput);
    }
    return encryptData(sKeyName, oInput);
  });

  if (oResult && oResult.encryptedData) {
    oElements.eEncryptedDataInput.value = String(oResult.encryptedData);
  }
}

async function handleDecrypt() {
  const sKeyName = getKeyName();
  const sKeyVersion = getKeyVersion();
  const sEncryptedData = getEncryptedData();
  requireValue("Key name", sKeyName);
  requireValue("Encrypted data", sEncryptedData);

  const oInput = {
    algorithm: getAlgorithm(),
    encryptedData: sEncryptedData,
  };

  const oResult = await runAction(shouldUseVersion() ? "Decrypt data with version" : "Decrypt data", () => {
    if (shouldUseVersion()) {
      requireValue("Key version", sKeyVersion);
      return decryptDataWithVersion(sKeyName, sKeyVersion, oInput);
    }
    return decryptData(sKeyName, oInput);
  });

  if (oResult && oResult.rawData !== undefined && oResult.rawData !== null) {
    oElements.eRawDataInput.value = String(oResult.rawData);
  }
}

async function handleEnableDebugger() {
  if (oState.bDebuggerEnabled) {
    setStatus("Debugger is already enabled.", "success");
    return;
  }

  await runAction("Enable debugger", async () => {
    enableDebugger();
    oState.bDebuggerEnabled = true;
    return { enabled: true };
  });
}

async function handleRawOperationSmoke() {
  await runAction("Raw operation smoke", () => callKeyVaultOperation("ListSecrets", {}));
}

function clearOutput() {
  oElements.eOutputPanel.textContent = "Run a Key Vault helper to inspect the response.";
  setLastAction("None");
  setStatus("Output cleared.", "pending");
}

function bindEvents() {
  oElements.eEnableDebuggerButton.addEventListener("click", () => {
    handleEnableDebugger().catch(() => {});
  });

  oElements.eClearOutputButton.addEventListener("click", clearOutput);
  oElements.eListSecretsButton.addEventListener("click", () => {
    handleListSecrets().catch(() => {});
  });
  oElements.eListSecretVersionsButton.addEventListener("click", () => {
    handleListSecretVersions().catch(() => {});
  });
  oElements.eGetSecretButton.addEventListener("click", () => {
    handleGetSecret().catch(() => {});
  });
  oElements.eGetSecretMetadataButton.addEventListener("click", () => {
    handleGetSecretMetadata().catch(() => {});
  });
  oElements.eListKeysButton.addEventListener("click", () => {
    handleListKeys().catch(() => {});
  });
  oElements.eListKeyVersionsButton.addEventListener("click", () => {
    handleListKeyVersions().catch(() => {});
  });
  oElements.eGetKeyMetadataButton.addEventListener("click", () => {
    handleGetKeyMetadata().catch(() => {});
  });
  oElements.eEncryptButton.addEventListener("click", () => {
    handleEncrypt().catch(() => {});
  });
  oElements.eDecryptButton.addEventListener("click", () => {
    handleDecrypt().catch(() => {});
  });

  window.addEventListener("keydown", (oEvent) => {
    if ((oEvent.ctrlKey || oEvent.metaKey) && oEvent.key === "Enter") {
      handleRawOperationSmoke().catch(() => {});
    }
  });
}

function boot() {
  bindEvents();
  clearOutput();
}

boot();