
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


async function request(
  endpoint,
  options = {}
) {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Something went wrong with the request."
    );
  }

  return data;
}


// =========================================================
// GET SAVED LLM PROVIDER SETTINGS
// =========================================================

export async function getLLMSettings() {
  return request(
    "/settings/llm"
  );
}


// =========================================================
// SAVE / UPDATE LLM PROVIDER SETTINGS
// =========================================================

export async function saveLLMSettings(
  settings
) {
  return request(
    "/settings/llm",
    {
      method: "POST",
      body: JSON.stringify(settings),
    }
  );
}


// =========================================================
// CHECK CREDENTIAL STATUS
// =========================================================

export async function checkLLMCredential(
  providerId
) {
  return request(
    `/settings/llm/${encodeURIComponent(
      providerId
    )}/credential`
  );
}


// =========================================================
// DELETE LLM PROVIDER SETTINGS
// =========================================================

export async function deleteLLMProvider(
  providerId
) {
  return request(
    `/settings/llm/${encodeURIComponent(
      providerId
    )}`,
    {
      method: "DELETE",
    }
  );
}


// =========================================================
// GET REGISTERED PROVIDERS + MODELS
// =========================================================

export async function getLLMProviders() {
  return request(
    "/settings/llm/providers"
  );
}


// =========================================================
// OPTIONAL: GET MODELS FOR ONE PROVIDER
// =========================================================
//
// Keep this for now. We are not using it yet.
// It can be removed later if we continue loading
// all models through /settings/llm/providers.
//

export async function getLLMProviderModels(
  providerId
) {
  return request(
    `/settings/llm/providers/${encodeURIComponent(
      providerId
    )}/models`
  );
}

// =========================================================
// CHECK GENERIC PROVIDER RUNTIME STATUS
// =========================================================
export async function getProviderStatus(providerId) {
  return request(
    `/settings/llm/providers/${encodeURIComponent(providerId)}/status`
  );
}

// =========================================================
// GET RUNTIME-DISCOVERED MODELS FOR A PROVIDER
// =========================================================
export async function getProviderRuntimeModels(providerId) {
  return request(
    `/settings/llm/providers/${encodeURIComponent(providerId)}/models/runtime`
  );
}