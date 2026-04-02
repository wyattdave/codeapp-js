---
name: keyvault
description: "Use when: building or debugging Azure Key Vault connector flows in a Power Apps Code App, including keys, secrets, metadata, or encryptData and decryptData helpers."
---

# Azure Key Vault Connector Guide

> Agent limitation: do not use CLI commands directly from chat for Azure Key Vault setup. Use the built-in Sync Connections and Deploy buttons instead.

## Core Rule

The wrapper in `dev files/AzureKeyvault.js` is the repo-local source of truth.

- It retries `keyvault`, `KeyVault`, `azurekeyvault`, `azureKeyVault`, and `AzureKeyVault`.
- It already includes inline metadata for key, secret, encrypt, and decrypt operations.
- It exposes stable helpers that accept either positional arguments or a single options object.

## power.config.json

Prefer a connection reference whose `dataSources` array contains `keyvault`.

```json
{
  "connectionReferences": {
    "keyVaultConnection": {
      "id": "/providers/Microsoft.PowerApps/apis/shared_keyvault",
      "displayName": "Azure Key Vault",
      "dataSources": ["keyvault"],
      "authenticationType": "oauthDefault",
      "dataSets": {}
    }
  }
}
```

## Public Helper Surface

The wrapper exports:

- `listKeys()`
- `listKeyVersions(keyName)`
- `getKeyMetadata(keyName)`
- `getKeyVersionMetadata(keyName, keyVersion)`
- `encryptData(keyName, input)`
- `encryptDataWithVersion(keyName, keyVersion, input)`
- `decryptData(keyName, input)`
- `decryptDataWithVersion(keyName, keyVersion, input)`
- `listSecrets()`
- `listSecretVersions(secretName)`
- `getSecret(secretName)`
- `getSecretMetadata(secretName)`
- `getSecretVersion(secretName, secretVersion)`
- `getSecretVersionMetadata(secretName, secretVersion)`
- `callKeyVaultOperation(operationName, parameters)`

## Important Wrapper Behavior

- `encryptData(...)` and `decryptData(...)` default `algorithm` to `RSA-OAEP-256`.
- If `keyVersion` is present in the options object, the wrapper automatically chooses the version-specific connector action.
- Secret helper signatures still accept legacy extra arguments such as `apiVersion`, but the current wrapper does not send `apiVersion` to the connector.

## Safety Rules

- Treat `getSecret(...)`, `getSecretVersion(...)`, `decryptData(...)`, and `decryptDataWithVersion(...)` results as secret material.
- Do not log or render secret values unless the user explicitly asks for it.

## Debugging

- If a key operation fails while secret operations work, check whether the wrapper call is using the right helper rather than assuming the secret helpers cover the full connector surface.
- If the error mentions missing `path`, the raw operation name is wrong or the inline metadata is incomplete.
- Prefer the wrapper's helper names over writing raw connector calls by hand.