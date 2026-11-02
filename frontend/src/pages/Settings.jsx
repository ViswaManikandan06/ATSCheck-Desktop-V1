import {
  Check,
  HardDrive,
  KeyRound,
  Laptop,
  Loader2,
  Lock,
  RefreshCw,
  Server,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";

import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

// ============================================================
// API
// ============================================================

async function apiRequest(path, options = {}) {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        data?.message ||
        "Request failed."
    );
  }

  return data;
}

// ============================================================
// Helpers
// ============================================================

function getProviderId(provider) {
  return (
    provider?.provider_id ||
    provider?.id ||
    ""
  );
}

function maskApiKey(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `${trimmed.slice(0, 2)}••••••${trimmed.slice(-2)}`;
}

function isMaskedApiKey(value) {
  return Boolean(
    value &&
    (value.includes("*") || value.includes("•"))
  );
}

function getProviderName(provider) {
  return (
    provider?.display_name ||
    provider?.name ||
    provider?.provider_id ||
    provider?.id ||
    "Unknown Provider"
  );
}

function getOllamaModelId(model) {
  if (!model) {
    return "";
  }

  return (
    model.model ||
    model.name ||
    ""
  );
}

function getOllamaModelDisplayName(model) {
  if (!model) {
    return "Unknown Model";
  }

  return (
    model.name ||
    model.model ||
    "Unknown Model"
  );
}

// ============================================================
// Settings
// ============================================================

function Settings() {
  const [activeSection, setActiveSection] =
    useState("provider");

  // ==========================================================
  // Provider
  // ==========================================================

  const [providers, setProviders] =
    useState([]);

  const [selectedProvider, setSelectedProvider] =
    useState("");

  const [selectedModel, setSelectedModel] =
    useState("");

  const [providerModels, setProviderModels] =
    useState([]);

  const [providerLoading, setProviderLoading] =
    useState(true);

  const [modelsLoading, setModelsLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [providerError, setProviderError] =
    useState("");

  const [saveMessage, setSaveMessage] =
    useState("");

  // ==========================================================
  // API Key
  // ==========================================================

  const [apiKey, setApiKey] =
    useState("");

  const [showApiKey, setShowApiKey] =
    useState(false);

  const [savingApiKey, setSavingApiKey] =
    useState(false);

  const [apiKeySaved, setApiKeySaved] =
    useState(false);

  // ==========================================================
  // Ollama
  // ==========================================================

  const [ollamaStatus, setOllamaStatus] =
    useState(null);

  const [ollamaModels, setOllamaModels] =
    useState([]);

  const [ollamaLoading, setOllamaLoading] =
    useState(false);

  const [ollamaAction, setOllamaAction] =
    useState(null);

  const [ollamaError, setOllamaError] =
    useState("");

  const [ollamaModelInput, setOllamaModelInput] =
    useState("");

  const [pullingModel, setPullingModel] =
    useState("");

  const [pullProgress, setPullProgress] =
    useState(null);

  const [serveLoading, setServeLoading] =
    useState(false);

  const [disconnectLoading, setDisconnectLoading] =
    useState(false);

  // ==========================================================
  // Load saved configuration
  // ==========================================================

  const loadSettings = async () => {
    try {
      const data =
        await apiRequest(
          "/settings/llm"
        );

      const savedProviders =
        data?.providers || [];

      const activeProvider =
        savedProviders.find(
          (provider) =>
            provider.is_active === true
        );

      if (activeProvider) {
        setSelectedProvider(
          activeProvider.provider_id
        );

        setSelectedModel(
          activeProvider.model_id || ""
        );

        if (activeProvider.provider_id !== "ollama") {
          const hasSavedKey = !!activeProvider.has_credentials;

          setApiKeySaved(hasSavedKey);
          setApiKey("");

          apiRequest(
            `/settings/llm/${encodeURIComponent(
              activeProvider.provider_id
            )}/credential`
          )
            .then((credentialStatus) => {
              if (!credentialStatus?.has_credentials) {
                setApiKeySaved(false);
                return;
              }

              setApiKeySaved(true);
              setApiKey(
                credentialStatus.masked_api_key || "••••"
              );
            })
            .catch((error) => {
              console.error(
                "Failed to load saved API key status:",
                error
              );
            });
        }
      }

    } catch (error) {
      console.error(
        "Failed to load LLM settings:",
        error
      );
    }
  };

  // ==========================================================
  // Load available providers
  // ==========================================================

  const loadProviders = async () => {
    setProviderLoading(true);
    setProviderError("");

    try {
      const data =
        await apiRequest(
          "/settings/llm/providers"
        );

      setProviders(
        data?.providers || []
      );

    } catch (error) {
      console.error(
        "Failed to load providers:",
        error
      );

      setProviderError(
        error.message
      );

    } finally {
      setProviderLoading(false);
    }
  };

  // ==========================================================
  // Load cloud provider models
  // ==========================================================

  const loadProviderModels =
    async (providerId) => {
      if (!providerId) {
        setProviderModels([]);
        return;
      }

      setModelsLoading(true);
      setProviderError("");

      try {
        const runtimeData =
          await apiRequest(
            `/settings/llm/providers/${encodeURIComponent(
              providerId
            )}/models/runtime`
          );

        const runtimeModels =
          runtimeData?.models || [];

        const nextModels = Array.isArray(runtimeModels)
          ? runtimeModels
          : [];

        setProviderModels(nextModels);

        if (nextModels.length === 1) {
          const modelId = nextModels[0]?.model_id || nextModels[0]?.id || nextModels[0]?.name;
          if (modelId && !selectedModel) {
            setSelectedModel(modelId);
          }
        }

      } catch (error) {
        console.error(
          "Failed to load provider models:",
          error
        );

        setProviderModels([]);
        setProviderError(
          error.message
        );

      } finally {
        setModelsLoading(false);
      }
    };

  // ==========================================================
  // Initial load
  // ==========================================================

  useEffect(() => {
    loadSettings();
    loadProviders();
  }, []);

  // ==========================================================
  // Load cloud models when provider changes
  // ==========================================================

  useEffect(() => {
    if (!selectedProvider) {
      return;
    }

    if (
      selectedProvider ===
      "ollama"
    ) {
      return;
    }

    if (apiKeySaved) {
      loadProviderModels(
        selectedProvider
      );
      return;
    }

    loadProviderModels(
      selectedProvider,
      apiKey
    );
  }, [
    selectedProvider,
    apiKeySaved,
  ]);

  // ==========================================================
  // Runtime status for selected provider
  // ==========================================================

  const loadProviderRuntimeStatus =
    async () => {
      if (!selectedProvider) {
        return;
      }

      setOllamaLoading(true);
      setOllamaError("");

      try {
        const status =
          await apiRequest(
            `/settings/llm/providers/${encodeURIComponent(
              selectedProvider
            )}/status`
          );

        setOllamaStatus(status);

        if (status?.running) {
          await loadProviderRuntimeModels();
        } else {
          setOllamaModels([]);
        }

      } catch (error) {
        console.error(
          "Failed to check provider runtime:",
          error
        );

        setOllamaError(
          error.message
        );

        setOllamaStatus({
          installed: false,
          running: false,
        });

        setOllamaModels([]);

      } finally {
        setOllamaLoading(false);
      }
    };

  // ==========================================================
  // Load runtime-discovered provider models
  // ==========================================================

  const loadProviderRuntimeModels =
    async () => {
      if (!selectedProvider) {
        return;
      }

      try {
        const data =
          await apiRequest(
            `/settings/llm/providers/${encodeURIComponent(
              selectedProvider
            )}/models/runtime`
          );

        const models =
          data?.models ||
          data ||
          [];

        setOllamaModels(
          Array.isArray(models)
            ? models
            : []
        );

      } catch (error) {
        console.error(
          "Failed to load provider runtime models:",
          error
        );

        setOllamaModels([]);

        setOllamaError(
          error.message
        );
      }
    };

  // ==========================================================
  // Load Ollama when selected
  // ==========================================================

  useEffect(() => {
    if (
      activeSection ===
        "provider" &&
      selectedProvider
    ) {
      loadProviderRuntimeStatus();
    }
  }, [
    activeSection,
    selectedProvider,
  ]);

  // ==========================================================
  // Provider selection
  // ==========================================================

  const handleProviderChange =
    async (providerId) => {
      setSelectedProvider(
        providerId
      );

      setSelectedModel("");
      setProviderModels([]);
      setSaveMessage("");
      setProviderError("");

      if (!providerId) {
        return;
      }

      if (providerId === "ollama") {
        setApiKeySaved(false);
        setApiKey("");
        return;
      }

      try {
        const credentialStatus = await apiRequest(
          `/settings/llm/${encodeURIComponent(
            providerId
          )}/credential`
        );

        const hasSavedKey = !!credentialStatus?.has_credentials;

        setApiKeySaved(hasSavedKey);
        setApiKey(
          hasSavedKey
            ? credentialStatus.masked_api_key || "••••"
            : ""
        );

        await loadProviderModels(providerId);
      } catch (error) {
        console.error(
          "Failed to check provider credential:",
          error
        );
        setApiKeySaved(false);
        setApiKey("");
      }
    };

  // ==========================================================
  // Cloud model selection
  // ==========================================================

  const handleModelSelect =
    (modelId) => {
      if (!modelId) {
        return;
      }

      setSelectedModel(
        modelId
      );

      setSaveMessage("");

      setProviderError("");
    };

  // ==========================================================
  // Ollama model selection
  // ==========================================================

  const handleUseOllamaModel =
    (model) => {
      const modelId =
        getOllamaModelId(
          model
        );

      if (!modelId) {
        setOllamaError(
          "Unable to determine Ollama model ID."
        );

        return;
      }

      setSelectedProvider(
        "ollama"
      );

      setSelectedModel(
        modelId
      );

      setSaveMessage("");

      setOllamaError("");
    };

  // ==========================================================
  // Save provider configuration
  // ==========================================================

  const handleSaveApiKey =
    async () => {
      if (
        !selectedProvider
      ) {
        setProviderError(
          "Select a provider first."
        );

        return;
      }

      const trimmedKey = apiKey.trim();

      if (!trimmedKey || isMaskedApiKey(trimmedKey)) {
        setProviderError(
          "Enter the actual API key. The masked value is for display only."
        );

        return;
      }

      setSavingApiKey(true);
      setProviderError("");
      setSaveMessage("");

      try {
        await apiRequest(
          `/settings/llm/${encodeURIComponent(
            selectedProvider
          )}/credential`,
          {
            method: "POST",
            body: JSON.stringify({
              api_key: trimmedKey,
            }),
          }
        );

        const savedCredential = await apiRequest(
          `/settings/llm/${encodeURIComponent(
            selectedProvider
          )}/credential`
        );

        setApiKey(
          savedCredential.masked_api_key ||
          maskApiKey(trimmedKey)
        );
        setApiKeySaved(true);
        setSaveMessage(
          "API key saved securely. Loading models..."
        );

        await loadProviderModels(selectedProvider);
      } catch (error) {
        console.error(
          "Failed to save API key:",
          error
        );

        setApiKeySaved(false);
        setProviderError(
          error.message
        );
      } finally {
        setSavingApiKey(false);
      }
    };

  const handleDeleteApiKey =
    async () => {
      if (!selectedProvider) {
        return;
      }

      try {
        setSavingApiKey(true);
        setProviderError("");
        setSaveMessage("");

        await apiRequest(
          `/settings/llm/${encodeURIComponent(
            selectedProvider
          )}/credential`,
          {
            method: "DELETE",
          }
        );

        setApiKey("");
        setApiKeySaved(false);
        setProviderModels([]);
        setSelectedModel("");
        setSaveMessage(
          "API key deleted. Add a new one to continue."
        );
      } catch (error) {
        console.error(
          "Failed to delete API key:",
          error
        );
        setProviderError(error.message);
      } finally {
        setSavingApiKey(false);
      }
    };

  const handleSave =
    async () => {
      if (
        !selectedProvider
      ) {
        setProviderError(
          "Select a provider first."
        );

        return;
      }

      if (
        selectedProvider !==
          "ollama" &&
        apiKey.trim() &&
        !apiKeySaved &&
        !isMaskedApiKey(apiKey)
      ) {
        await handleSaveApiKey();
      }

      if (
        !selectedModel
      ) {
        setProviderError(
          "Select a model first."
        );

        return;
      }

      if (
        selectedProvider !==
          "ollama" &&
        !apiKeySaved &&
        (!apiKey.trim() || isMaskedApiKey(apiKey))
      ) {
        setProviderError(
          "Save the provider API key before saving the configuration."
        );

        return;
      }

      setSaving(true);
      setSaveMessage("");
      setProviderError("");

      try {
        const payload = {
          provider_id:
            selectedProvider,

          model_id:
            selectedModel,

          api_key:
            selectedProvider ===
            "ollama"
              ? null
              : apiKeySaved
                ? null
                : apiKey || null,

          enabled: true,

          is_active: true,
        };

        console.log(
          "Saving LLM configuration:",
          payload
        );

        await apiRequest(
          "/settings/llm",
          {
            method: "POST",

            body:
              JSON.stringify(
                payload
              ),
          }
        );

        setSaveMessage(
          `${
            selectedProvider ===
            "ollama"
              ? "Ollama"
              : "LLM"
          } configuration saved successfully.`
        );

      } catch (error) {
        console.error(
          "Failed to save LLM settings:",
          error
        );

        setProviderError(
          error.message
        );

      } finally {
        setSaving(false);
      }
    };

  // ==========================================================
  // Delete Ollama model
  // ==========================================================

  const handleDeleteModel =
    async (model) => {
      const modelId =
        getOllamaModelId(
          model
        );

      if (!modelId) {
        setOllamaError(
          "Unable to determine Ollama model ID."
        );

        return;
      }

      setOllamaAction(
        `delete:${modelId}`
      );

      setOllamaError("");

      try {
        await apiRequest(
          `/settings/llm/providers/${encodeURIComponent(
            selectedProvider
          )}/models/runtime`,
          {
            method: "DELETE",

            body:
              JSON.stringify({
                model_id:
                  modelId,
              }),
          }
        );

        if (
          selectedModel ===
          modelId
        ) {
          setSelectedModel("");
        }

        await loadProviderRuntimeModels();

      } catch (error) {
        console.error(
          "Failed to delete Ollama model:",
          error
        );

        setOllamaError(
          error.message
        );

      } finally {
        setOllamaAction(null);
      }
    };

  // ==========================================================
  // Start Ollama
  // ==========================================================

  const handleServeOllama =
    async () => {
      setServeLoading(true);
      setOllamaError("");

      try {
        await apiRequest(
          "/settings/llm/providers/ollama/serve",
          {
            method: "POST",
          }
        );

        await loadProviderRuntimeStatus();

      } catch (error) {
        console.error(
          "Failed to start Ollama:",
          error
        );

        setOllamaError(
          error.message
        );

      } finally {
        setServeLoading(false);
      }
    };

  // ==========================================================
  // Disconnect Ollama
  // ==========================================================

  const handleDisconnectOllama =
    async () => {
      setDisconnectLoading(true);
      setOllamaError("");

      try {
        await apiRequest(
          "/settings/llm/providers/ollama/disconnect",
          {
            method: "POST",
          }
        );

        await loadProviderRuntimeStatus();

      } catch (error) {
        console.error(
          "Failed to disconnect Ollama:",
          error
        );

        setOllamaError(
          error.message
        );

      } finally {
        setDisconnectLoading(false);
      }
    };

  // ==========================================================
  // Pull Ollama model with streaming progress
  // ==========================================================

  const handlePullOllamaModel =
    async (modelName) => {
      const normalizedName = (
        modelName ||
        ollamaModelInput ||
        ""
      ).trim();

      if (!normalizedName) {
        setOllamaError(
          "Enter a model name to pull."
        );

        return;
      }

      setPullingModel(
        normalizedName
      );

      setPullProgress({
        status: "Starting...",
        completed: 0,
        total: 0,
        percent: 0,
      });

      setOllamaError("");

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/settings/llm/providers/ollama/models/pull`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  model_id:
                    normalizedName,
                }),
            }
          );

        if (!response.ok) {
          const data =
            await response
              .json()
              .catch(
                () => ({})
              );

          throw new Error(
            data?.detail ||
              data?.message ||
              "Failed to pull Ollama model."
          );
        }

        if (!response.body) {
          throw new Error(
            "Pull endpoint does not support streaming."
          );
        }

        const reader =
          response.body.getReader();

        const decoder =
          new TextDecoder();

        let buffer = "";

        while (true) {
          const {
            value,
            done,
          } =
            await reader.read();

          if (done) {
            break;
          }

          buffer +=
            decoder.decode(
              value,
              {
                stream: true,
              }
            );

          const lines =
            buffer.split(
              "\n"
            );

          buffer =
            lines.pop() || "";

          for (
            const line of lines
          ) {
            const trimmed =
              line.trim();

            if (!trimmed) {
              continue;
            }

            try {
              const progress =
                JSON.parse(
                  trimmed
                );

              const completed =
                Number(
                  progress.completed ||
                    0
                );

              const total =
                Number(
                  progress.total ||
                    0
                );

              const percent =
                total > 0
                  ? Math.min(
                      100,
                      Math.round(
                        (completed /
                          total) *
                          100
                      )
                    )
                  : 0;

              setPullProgress({
                status:
                  progress.status ||
                  "Downloading...",
                completed,
                total,
                percent,
              });

            } catch {
              console.warn(
                "Invalid Ollama progress event:",
                trimmed
              );
            }
          }
        }

        setPullProgress({
          status: "Complete",
          completed: 1,
          total: 1,
          percent: 100,
        });

        setOllamaModelInput("");

        await loadProviderRuntimeStatus();

      } catch (error) {
        console.error(
          "Failed to pull Ollama model:",
          error
        );

        setOllamaError(
          error.message
        );

        setPullProgress(null);

      } finally {
        setPullingModel("");
      }
    };

  // ==========================================================
  // Selected provider metadata
  // ==========================================================

  const selectedProviderInfo =
    useMemo(
      () =>
        providers.find(
          (provider) =>
            getProviderId(
              provider
            ) ===
            selectedProvider
        ),
      [
        providers,
        selectedProvider,
      ]
    );

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="mx-auto max-w-7xl">

      {/* =====================================================
          Header
      ===================================================== */}

      <section className="mb-8">

        <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-gray-500">
          Application
        </p>

        <h1 className="text-5xl font-black tracking-[-0.04em]">
          Settings.
        </h1>

        <p className="mt-3 max-w-xl font-semibold leading-6 text-gray-600">
          Configure AI providers, local models,
          storage and privacy.
        </p>

      </section>

      {/* =====================================================
          Workspace
      ===================================================== */}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">

        {/* ===================================================
            Navigation
        =================================================== */}

        <aside className="h-fit border-[3px] border-black bg-white shadow-[6px_6px_0_#111]">

          <div className="border-b-[3px] border-black bg-[#f5f1e8] p-4">

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Settings
            </p>

          </div>

          <nav className="p-2">

            <SettingsNavItem
              label="AI Provider"
              icon={Server}
              active={
                activeSection ===
                "provider"
              }
              onClick={() =>
                setActiveSection(
                  "provider"
                )
              }
            />

            <SettingsNavItem
              label="Storage"
              icon={HardDrive}
              active={
                activeSection ===
                "storage"
              }
              onClick={() =>
                setActiveSection(
                  "storage"
                )
              }
            />

            <SettingsNavItem
              label="Privacy"
              icon={ShieldCheck}
              active={
                activeSection ===
                "privacy"
              }
              onClick={() =>
                setActiveSection(
                  "privacy"
                )
              }
            />

            <SettingsNavItem
              label="Application"
              icon={Laptop}
              active={
                activeSection ===
                "application"
              }
              onClick={() =>
                setActiveSection(
                  "application"
                )
              }
            />

          </nav>

        </aside>

        {/* ===================================================
            Main
        =================================================== */}

        <main>

          {activeSection ===
            "provider" && (

            <section>

              <SettingsHeader
                eyebrow="AI Configuration"
                title="LLM Provider"
                description="Choose which AI system powers ATS analysis and resume tailoring."
                icon={Server}
              />

              <div className="mt-6 border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">

                {/* =================================================
                    Provider selection
                ================================================= */}

                <div className="border-b-[3px] border-black p-6">

                  <label className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                    Provider
                  </label>

                  {providerLoading ? (

                    <div className="mt-5 flex items-center gap-3 font-black">

                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                      Loading providers...

                    </div>

                  ) : (

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">

                      {providers.map(
                        (
                          provider
                        ) => {

                          const id =
                            getProviderId(
                              provider
                            );

                          const name =
                            getProviderName(
                              provider
                            );

                          return (
                            <ProviderButton
                              key={id}
                              name={name}
                              active={
                                selectedProvider ===
                                id
                              }
                              onClick={() =>
                                handleProviderChange(
                                  id
                                )
                              }
                            />
                          );
                        }
                      )}

                    </div>

                  )}

                </div>

                {/* =================================================
                    Ollama
                ================================================= */}

                {selectedProvider ===
                  "ollama" ? (

                  <OllamaSettings
                    status={
                      ollamaStatus
                    }

                    models={
                      ollamaModels
                    }

                    selectedModel={
                      selectedModel
                    }

                    loading={
                      ollamaLoading
                    }

                    action={
                      ollamaAction
                    }

                    error={
                      ollamaError
                    }

                    modelInput={
                      ollamaModelInput
                    }

                    onModelInputChange={
                      setOllamaModelInput
                    }

                    onRefresh={
                      loadProviderRuntimeStatus
                    }

                    onDeleteModel={
                      handleDeleteModel
                    }

                    onSelectModel={
                      handleUseOllamaModel
                    }

                    onSave={
                      handleSave
                    }

                    onPullModel={
                      handlePullOllamaModel
                    }

                    onServe={
                      handleServeOllama
                    }

                    onDisconnect={
                      handleDisconnectOllama
                    }

                    saving={
                      saving
                    }

                    pullingModel={
                      pullingModel
                    }

                    pullProgress={
                      pullProgress
                    }

                    serveLoading={
                      serveLoading
                    }

                    disconnectLoading={
                      disconnectLoading
                    }
                  />

                ) : (

                  <CloudProviderSettings
                    provider={
                      selectedProviderInfo
                    }

                    models={
                      providerModels
                    }

                    selectedModel={
                      selectedModel
                    }

                    loading={
                      modelsLoading
                    }

                    apiKey={
                      apiKey
                    }

                    setApiKey={
                      setApiKey
                    }

                    showApiKey={
                      showApiKey
                    }

                    setShowApiKey={
                      setShowApiKey
                    }

                    onSelectModel={
                      handleModelSelect
                    }

                    onSave={
                      handleSave
                    }

                    onSaveApiKey={
                      handleSaveApiKey
                    }

                    onDeleteApiKey={
                      handleDeleteApiKey
                    }

                    apiKeySaved={
                      apiKeySaved
                    }

                    saving={
                      saving
                    }

                    savingApiKey={
                      savingApiKey
                    }
                  />

                )}

              </div>

              {/* =================================================
                  Error
              ================================================= */}

              {providerError && (

                <div className="mt-5 flex gap-3 border-[3px] border-black bg-[#ffdddd] p-4 font-bold shadow-[4px_4px_0_#111]">

                  <X
                    size={20}
                    strokeWidth={3}
                  />

                  {providerError}

                </div>

              )}

              {/* =================================================
                  Success
              ================================================= */}

              {saveMessage && (

                <div className="mt-5 flex gap-3 border-[3px] border-black bg-[#b8ff5a] p-4 font-black shadow-[4px_4px_0_#111]">

                  <Check
                    size={20}
                    strokeWidth={4}
                  />

                  {saveMessage}

                </div>

              )}

            </section>
          )}

          {activeSection ===
            "storage" && (

            <StorageSettings />

          )}

          {activeSection ===
            "privacy" && (

            <PrivacySettings />

          )}

          {activeSection ===
            "application" && (

            <ApplicationSettings />

          )}

        </main>

      </div>

    </div>
  );
}

// ============================================================
// Settings Header
// ============================================================

function SettingsHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}) {
  return (
    <div className="flex items-start gap-4">

      <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-[#ffcf56]">

        <Icon
          size={24}
          strokeWidth={3}
        />

      </div>

      <div>

        <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
          {eyebrow}
        </p>

        <h2 className="mt-1 text-3xl font-black">
          {title}
        </h2>

        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-600">
          {description}
        </p>

      </div>

    </div>
  );
}

// ============================================================
// Navigation Item
// ============================================================

function SettingsNavItem({
  label,
  icon: Icon,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex w-full items-center gap-3 px-3 py-3 text-left font-black transition-all",
        active
          ? "border-[2px] border-black bg-[#b8ff5a]"
          : "hover:bg-[#f5f1e8]",
      ].join(" ")}
    >

      <Icon
        size={17}
        strokeWidth={3}
      />

      {label}

    </button>
  );
}

// ============================================================
// Provider Button
// ============================================================

function ProviderButton({
  name,
  active,
  onClick,
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "flex items-center justify-between border-[3px] border-black px-4 py-3 text-left font-black transition-all",
        active
          ? "bg-[#b8ff5a] shadow-[3px_3px_0_#111]"
          : "bg-white hover:bg-[#f5f1e8]",
      ].join(" ")}
    >

      <span>
        {name}
      </span>

      {active && (

        <Check
          size={18}
          strokeWidth={4}
        />

      )}

    </button>
  );
}

// ============================================================
// Cloud Provider Settings
// ============================================================

function CloudProviderSettings({
  provider,
  models,
  selectedModel,
  loading,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  onSelectModel,
  onSave,
  onSaveApiKey,
  onDeleteApiKey,
  apiKeySaved,
  saving,
  savingApiKey,
}) {
  return (
    <div className="p-6">

      <div>

        <label className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
          Available Models
        </label>

        <h3 className="mt-1 text-2xl font-black">
          Choose a model
        </h3>

        {provider && (

          <p className="mt-1 text-sm font-semibold text-gray-600">
            Provider:{" "}
            {getProviderName(
              provider
            )}
          </p>

        )}

        {loading ? (

          <div className="mt-5 flex items-center gap-3 border-[3px] border-black bg-[#f5f1e8] p-5 font-black">

            <Loader2
              size={19}
              className="animate-spin"
            />

            Loading available models...

          </div>

        ) : models.length === 0 ? (

          <div className="mt-5 border-[3px] border-dashed border-black bg-[#f5f1e8] p-6">

            <p className="font-black">
              No models available.
            </p>

          </div>

        ) : (

          <div className="mt-5 grid gap-3">

            {models.map(
              (model) => {

                const id =
                  model.model_id ||
                  model.id ||
                  model.name;

                const name =
                  model.display_name ||
                  model.name ||
                  model.model_id ||
                  model.id;

                const selected =
                  selectedModel ===
                  id;

                return (

                  <button
                    key={id}
                    onClick={() =>
                      onSelectModel(
                        id
                      )
                    }
                    className={[
                      "w-full border-[3px] border-black p-5 text-left transition-all",
                      selected
                        ? "bg-[#b8ff5a] shadow-[4px_4px_0_#111]"
                        : "bg-white hover:bg-[#f5f1e8]",
                    ].join(" ")}
                  >

                    <div className="flex items-center justify-between">

                      <div>

                        <h4 className="font-mono text-lg font-black">
                          {name}
                        </h4>

                        {selected && (

                          <span className="mt-2 inline-block border-[2px] border-black bg-white px-2 py-1 text-[10px] font-black uppercase">
                            Selected
                          </span>

                        )}

                      </div>

                      {selected && (

                        <Check
                          size={22}
                          strokeWidth={4}
                        />

                      )}

                    </div>

                  </button>
                );
              }
            )}

          </div>

        )}

      </div>

      {/* =====================================================
          API key
      ===================================================== */}

      <div className="mt-8 border-t-[3px] border-black pt-6">

        <div className="flex items-center justify-between">

          <label className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
            API Key
          </label>

          <span className="flex items-center gap-1 text-xs font-black text-gray-500">

            <Lock
              size={13}
              strokeWidth={3}
            />

            Stored locally

          </span>

        </div>

        <div className="mt-2 flex">

          <div className="relative flex-1">

            <KeyRound
              size={17}
              strokeWidth={3}
              className="absolute left-4 top-1/2 -translate-y-1/2"
            />

            <input
              type={
                showApiKey
                  ? "text"
                  : "password"
              }
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                if (apiKeySaved) {
                  setApiKeySaved(false);
                }
              }}
              placeholder={
                apiKeySaved
                  ? "API key saved securely"
                  : "Enter API key"
              }
              className="w-full border-[3px] border-black bg-white py-3 pl-11 pr-4 font-mono font-bold outline-none focus:bg-[#f5f1e8]"
            />

          </div>

          <button
            onClick={() =>
              setShowApiKey(
                !showApiKey
              )
            }
            className="border-y-[3px] border-r-[3px] border-black bg-[#f5f1e8] px-4 text-sm font-black hover:bg-[#ffcf56]"
          >
            {showApiKey
              ? "Hide"
              : "Show"}
          </button>

        </div>

        {apiKeySaved && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setApiKey("");
                setApiKeySaved(false);
                setSaveMessage("");
                setProviderError("");
              }}
              className="border-[3px] border-black bg-[#f5f1e8] px-3 py-2 text-xs font-black shadow-[2px_2px_0_#111] hover:bg-[#ffcf56]"
            >
              Replace API key
            </button>

            <button
              type="button"
              onClick={onDeleteApiKey}
              className="border-[3px] border-black bg-[#ffdddd] px-3 py-2 text-xs font-black shadow-[2px_2px_0_#111] hover:bg-[#ffb7b7]"
            >
              Delete API key
            </button>
          </div>
        )}

      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-black pt-6">
        <button
          onClick={onSaveApiKey}
          disabled={savingApiKey || (apiKeySaved && !apiKey.trim()) || (!apiKeySaved && !apiKey.trim())}
          className="border-[3px] border-black bg-[#f5f1e8] px-5 py-3 text-sm font-black shadow-[3px_3px_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingApiKey ? "Saving API key..." : apiKeySaved ? "API key saved" : "Save API key"}
        </button>

        <SaveButton
          onSave={onSave}
          saving={saving}
          disabled={!selectedModel || (!apiKeySaved && !apiKey.trim())}
          label="Save Configuration"
        />
      </div>

    </div>
  );
}

// ============================================================
// Ollama Settings
// ============================================================

function OllamaSettings({
  status,
  models,
  selectedModel,
  loading,
  action,
  error,
  modelInput,
  onModelInputChange,
  onRefresh,
  onDeleteModel,
  onSelectModel,
  onSave,
  onPullModel,
  onServe,
  onDisconnect,
  saving,
  pullingModel,
  pullProgress,
  serveLoading,
  disconnectLoading,
}) {
  const installed =
    Boolean(
      status?.installed
    );

  const running =
    Boolean(
      status?.running
    );

  return (
    <div className="p-6">

      {/* =====================================================
          Runtime Status
      ===================================================== */}

      <div className="border-[3px] border-black bg-[#f5f1e8] p-5">

        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div className="flex gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-white">

              <Laptop
                size={24}
                strokeWidth={3}
              />

            </div>

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                Local AI Runtime
              </p>

              <h3 className="mt-1 text-xl font-black">
                Ollama
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-600">
                Use a model already installed on your machine.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-3">

            <OllamaStatus
              installed={
                installed
              }
              running={
                running
              }
            />

            {running && (

              <button
                type="button"
                onClick={
                  onDisconnect
                }
                disabled={
                  disconnectLoading ||
                  loading ||
                  serveLoading ||
                  pullingModel !== ""
                }
                className="border-[3px] border-black bg-[#ffdddd] px-3 py-2 text-xs font-black disabled:opacity-50"
              >
                {disconnectLoading
                  ? "Disconnecting..."
                  : "Disconnect"}
              </button>

            )}

            <button
              onClick={
                onRefresh
              }
              disabled={
                loading ||
                action !== null ||
                pullingModel !== ""
              }
              className="flex h-10 w-10 items-center justify-center border-[3px] border-black bg-white hover:bg-[#ffcf56] disabled:opacity-50"
            >

              <RefreshCw
                size={17}
                className={
                  loading
                    ? "animate-spin"
                    : ""
                }
                strokeWidth={3}
              />

            </button>

          </div>

        </div>

        {/* ===================================================
            Offline
        =================================================== */}

        {!running && (

          <div className="mt-5 border-[3px] border-black bg-white p-6">

            <h3 className="text-xl font-black">
              Install and start Ollama
            </h3>

            <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
              Download the local runtime for your system, then start it before selecting a model.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-3">

              <a
                href={
                  status?.download_url ||
                  "https://ollama.com/download/mac"
                }
                target="_blank"
                rel="noreferrer"
                className="border-[3px] border-black bg-[#b8ff5a] p-4 text-center font-black shadow-[3px_3px_0_#111] hover:-translate-y-0.5"
              >
                Download Ollama
              </a>

              <button
                type="button"
                onClick={
                  onServe
                }
                disabled={
                  serveLoading ||
                  loading
                }
                className="border-[3px] border-black bg-[#ffcf56] p-4 text-center font-black shadow-[3px_3px_0_#111] hover:-translate-y-0.5 disabled:opacity-60"
              >
                {serveLoading
                  ? "Starting..."
                  : "Serve Ollama"}
              </button>

              <a
                href="https://ollama.com/library"
                target="_blank"
                rel="noreferrer"
                className="border-[3px] border-black bg-white p-4 text-center font-black shadow-[3px_3px_0_#111] hover:-translate-y-0.5"
              >
                Model Library
              </a>

            </div>

            <div className="mt-5 border-[2px] border-black bg-[#f5f1e8] p-4">

              <div className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                After install
              </div>

              <button
                type="button"
                onClick={
                  onServe
                }
                disabled={
                  serveLoading ||
                  loading
                }
                className="border-[3px] border-black bg-[#b8ff5a] px-4 py-2 font-black shadow-[3px_3px_0_#111] disabled:opacity-60"
              >
                {serveLoading
                  ? "Starting Ollama..."
                  : "Start Ollama Server"}
              </button>

            </div>

            <div className="mt-5 border-[2px] border-dashed border-black bg-white p-4">

              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                Recommended models
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {[
                  "llama3.1:8b",
                  "llama3.1:70b",
                  "qwen2.5:7b",
                ].map(
                  (modelName) => (

                    <button
                      key={
                        modelName
                      }
                      type="button"
                      onClick={() =>
                        onPullModel(
                          modelName
                        )
                      }
                      disabled={
                        pullingModel !== ""
                      }
                      className="border-[2px] border-black bg-[#f5f1e8] px-2 py-1 font-mono text-xs font-black hover:bg-[#b8ff5a] disabled:opacity-50"
                    >
                      {pullingModel ===
                      modelName
                        ? "Pulling..."
                        : modelName}
                    </button>

                  )
                )}

              </div>

            </div>

          </div>

        )}

        {/* ===================================================
            Running
        =================================================== */}

        {running && (

          <div className="mt-5 flex items-center justify-between border-[2px] border-black bg-[#b8ff5a] p-4">

            <div className="flex items-center gap-3">

              <Check
                size={21}
                strokeWidth={4}
              />

              <div>

                <p className="font-black">
                  Ollama is running.
                </p>

                <p className="text-sm font-semibold">
                  Local models are ready.
                </p>

              </div>

            </div>

            {status?.version && (

              <span className="border-[2px] border-black bg-white px-2 py-1 font-mono text-xs font-black">
                {status.version}
              </span>

            )}

          </div>

        )}

      </div>

      {/* =====================================================
          Error
      ===================================================== */}

      {error && (

        <div className="mt-5 flex gap-3 border-[3px] border-black bg-[#ffdddd] p-4 font-bold">

          <X
            size={19}
            strokeWidth={3}
          />

          {error}

        </div>

      )}

      {/* =====================================================
          Installed Models
      ===================================================== */}

      {running && (

        <section className="mt-8">

          <div className="mb-4 flex items-end justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                Local Models
              </p>

              <h3 className="mt-1 text-2xl font-black">
                Installed Models
              </h3>

              <p className="mt-1 text-sm font-semibold text-gray-600">
                Select the model ATSCheck should use.
              </p>

            </div>

            <span className="border-[2px] border-black bg-[#f5f1e8] px-2 py-1 text-xs font-black">
              {models.length}
            </span>

          </div>

          {/* =================================================
              Pull Model
          ================================================= */}

          <div className="mb-4 border-[3px] border-black bg-white p-4">

            <div className="flex flex-col gap-3 md:flex-row md:items-center">

              <input
                type="text"
                value={
                  modelInput
                }
                onChange={(
                  event
                ) =>
                  onModelInputChange(
                    event.target
                      .value
                  )
                }
                disabled={
                  pullingModel !== ""
                }
                placeholder="Enter model name e.g. llama3.1:8b"
                className="flex-1 border-[3px] border-black bg-[#f5f1e8] px-3 py-3 font-mono text-sm font-bold outline-none disabled:opacity-60"
              />

              <button
                type="button"
                onClick={() =>
                  onPullModel(
                    modelInput
                  )
                }
                disabled={
                  pullingModel !== "" ||
                  !modelInput.trim()
                }
                className="border-[3px] border-black bg-[#b8ff5a] px-4 py-3 font-black shadow-[3px_3px_0_#111] disabled:opacity-50"
              >
                {pullingModel
                  ? "Pulling..."
                  : "Pull Model"}
              </button>

            </div>

            <div className="mt-3 flex flex-wrap gap-2">

              {[
                "llama3.1:8b",
                "llama3.1:70b",
                "qwen2.5:7b",
              ].map(
                (modelName) => (

                  <button
                    key={
                      modelName
                    }
                    type="button"
                    onClick={() =>
                      onPullModel(
                        modelName
                      )
                    }
                    disabled={
                      pullingModel !== ""
                    }
                    className="border-[2px] border-black bg-[#f5f1e8] px-2 py-1 font-mono text-xs font-black hover:bg-[#b8ff5a] disabled:opacity-50"
                  >
                    {pullingModel ===
                    modelName
                      ? "Pulling..."
                      : `Pull ${modelName}`}
                  </button>

                )
              )}

            </div>

            {/* =================================================
                Pull Progress
            ================================================= */}

            {pullingModel &&
              pullProgress && (

              <OllamaPullProgress
                model={
                  pullingModel
                }
                progress={
                  pullProgress
                }
              />

            )}

          </div>

          {/* =================================================
              Model List
          ================================================= */}

          {models.length ===
          0 ? (

            <div className="border-[3px] border-dashed border-black bg-white p-7 text-center">

              <p className="font-black">
                No Ollama models found.
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-500">
                Install a model with Ollama first.
              </p>

            </div>

          ) : (

            <div className="space-y-3">

              {models.map(
                (
                  model,
                  index
                ) => {

                  const modelId =
                    getOllamaModelId(
                      model
                    );

                  const displayName =
                    getOllamaModelDisplayName(
                      model
                    );

                  const selected =
                    selectedModel ===
                    modelId;

                  const deleting =
                    action ===
                    `delete:${modelId}`;

                  if (!modelId) {

                    return (

                      <div
                        key={
                          model?.digest ||
                          index
                        }
                        className="border-[3px] border-black bg-[#ffdddd] p-5"
                      >

                        <p className="font-black">
                          Unable to determine Ollama model ID.
                        </p>

                        <pre className="mt-3 overflow-auto border-[2px] border-black bg-white p-3 text-xs">
                          {JSON.stringify(
                            model,
                            null,
                            2
                          )}
                        </pre>

                      </div>

                    );
                  }

                  return (

                    <div
                      key={
                        modelId
                      }
                      className={[
                        "border-[3px] border-black bg-white p-5",
                        selected
                          ? "bg-[#faffef] shadow-[4px_4px_0_#111]"
                          : "",
                      ].join(" ")}
                    >

                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                        <div>

                          <div className="flex flex-wrap items-center gap-3">

                            <h4 className="font-mono text-lg font-black">
                              {displayName}
                            </h4>

                            {selected && (

                              <span className="border-[2px] border-black bg-[#b8ff5a] px-2 py-1 text-[10px] font-black uppercase">
                                Selected
                              </span>

                            )}

                          </div>

                          {modelId !==
                            displayName && (

                            <p className="mt-1 font-mono text-xs font-bold text-gray-500">
                              ID:{" "}
                              {modelId}
                            </p>

                          )}

                          {model.size && (

                            <p className="mt-1 text-xs font-bold text-gray-500">
                              {model.size}
                            </p>

                          )}

                        </div>

                        <div className="flex gap-2">

                          <button
                            onClick={() =>
                              onSelectModel(
                                model
                              )
                            }
                            disabled={
                              pullingModel !== ""
                            }
                            className={[
                              "border-[3px] border-black px-4 py-2 text-sm font-black disabled:opacity-50",
                              selected
                                ? "bg-[#b8ff5a]"
                                : "bg-white shadow-[3px_3px_0_#111] hover:bg-[#b8ff5a]",
                            ].join(" ")}
                          >
                            {selected
                              ? "Selected"
                              : "Use Model"}
                          </button>

                          <button
                            onClick={() =>
                              onDeleteModel(
                                model
                              )
                            }
                            disabled={
                              deleting ||
                              pullingModel !== ""
                            }
                            className="flex h-10 w-10 items-center justify-center border-[3px] border-black bg-white hover:bg-[#ffdddd] disabled:opacity-50"
                          >

                            {deleting ? (

                              <Loader2
                                size={
                                  17
                                }
                                className="animate-spin"
                              />

                            ) : (

                              <Trash2
                                size={
                                  17
                                }
                                strokeWidth={
                                  3
                                }
                              />

                            )}

                          </button>

                        </div>

                      </div>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

      )}

      {/* =====================================================
          Configuration
      ===================================================== */}

      {running && (

        <div className="mt-8 border-t-[3px] border-black pt-6">

          <div className="mb-4 flex items-center justify-between">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
                Configuration
              </p>

              <p className="mt-1 font-black">

                {selectedModel ? (

                  <>
                    Selected model:{" "}
                    <span className="font-mono">
                      {selectedModel}
                    </span>
                  </>

                ) : (

                  "No model selected"

                )}

              </p>

            </div>

          </div>

          <button
            onClick={
              onSave
            }
            disabled={
              saving ||
              !selectedModel ||
              pullingModel !== ""
            }
            className={[
              "flex items-center gap-2 border-[3px] border-black px-6 py-3 font-black shadow-[4px_4px_0_#111]",
              selectedModel &&
              !pullingModel
                ? "bg-[#b8ff5a]"
                : "cursor-not-allowed bg-gray-200 opacity-60",
            ].join(" ")}
          >

            {saving ? (

              <Loader2
                size={18}
                className="animate-spin"
              />

            ) : (

              <Check
                size={18}
                strokeWidth={4}
              />

            )}

            {saving
              ? "Saving..."
              : "Use This Model"}

          </button>

        </div>

      )}

    </div>
  );
}

// ============================================================
// Ollama Pull Progress
// ============================================================

function OllamaPullProgress({
  model,
  progress,
}) {
  const {
    status,
    completed,
    total,
    percent,
  } = progress;

  const formatBytes =
    (bytes) => {
      if (!bytes) {
        return "0 MB";
      }

      const mb =
        bytes /
        1024 /
        1024;

      if (mb < 1024) {
        return `${mb.toFixed(
          1
        )} MB`;
      }

      const gb =
        mb / 1024;

      return `${gb.toFixed(
        2
      )} GB`;
    };

  const hasSize =
    total > 0;

  const isComplete =
    percent >= 100;

  return (
    <div
      className={[
        "mt-5 border-[3px] border-black p-5 shadow-[4px_4px_0_#111]",
        isComplete
          ? "bg-[#b8ff5a]"
          : "bg-[#ffcf56]",
      ].join(" ")}
    >

      {/* =====================================================
          Header
      ===================================================== */}

      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3">

          {!isComplete && (

            <Loader2
              size={20}
              className="mt-0.5 shrink-0 animate-spin"
              strokeWidth={3}
            />

          )}

          {isComplete && (

            <Check
              size={21}
              className="mt-0.5 shrink-0"
              strokeWidth={4}
            />

          )}

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-700">
              {isComplete
                ? "Model Ready"
                : "Downloading Model"}
            </p>

            <h4 className="mt-1 font-mono text-lg font-black">
              {model}
            </h4>

            <p className="mt-1 text-sm font-bold text-gray-700">
              {status}
            </p>

          </div>

        </div>

        <div className="shrink-0 border-[2px] border-black bg-white px-3 py-1 font-mono text-sm font-black">
          {hasSize
            ? `${percent}%`
            : "..."}
        </div>

      </div>

      {/* =====================================================
          Progress Bar
      ===================================================== */}

      <div className="mt-5 h-7 overflow-hidden border-[3px] border-black bg-white p-1">

        <div
          className="h-full bg-[#b8ff5a] transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                percent
              )
            )}%`,
          }}
        />

      </div>

      {/* =====================================================
          Progress Details
      ===================================================== */}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black">

        <span>

          {hasSize
            ? `${formatBytes(
                completed
              )} / ${formatBytes(
                total
              )}`
            : "Preparing download..."}

        </span>

        <span>
          {hasSize
            ? `${percent}%`
            : ""}
        </span>

      </div>

    </div>
  );
}

// ============================================================
// Ollama Status
// ============================================================

function OllamaStatus({
  installed,
  running,
}) {
  if (!installed) {
    return (
      <span className="border-[2px] border-black bg-[#ffdddd] px-3 py-2 text-xs font-black">
        Ollama unavailable
      </span>
    );
  }

  if (!running) {
    return (
      <span className="border-[2px] border-black bg-[#ffcf56] px-3 py-2 text-xs font-black">
        Ollama offline
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2 border-[2px] border-black bg-[#b8ff5a] px-3 py-2 text-xs font-black">

      <span className="h-2.5 w-2.5 border-2 border-black bg-black" />

      Running

    </span>
  );
}

// ============================================================
// Save Button
// ============================================================

function SaveButton({
  onSave,
  saving,
  disabled,
  label,
}) {
  return (
    <div className="mt-7 flex justify-end border-t-[3px] border-black pt-6">

      <button
        onClick={
          onSave
        }
        disabled={
          saving ||
          disabled
        }
        className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-6 py-3 font-black shadow-[4px_4px_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
      >

        {saving ? (

          <Loader2
            size={18}
            className="animate-spin"
          />

        ) : (

          <Check
            size={18}
            strokeWidth={4}
          />

        )}

        {saving
          ? "Saving..."
          : label}

      </button>

    </div>
  );
}

// ============================================================
// Storage
// ============================================================

function StorageSettings() {
  return (
    <section>

      <SettingsHeader
        eyebrow="Local Data"
        title="Storage"
        description="All ATSCheck data is stored locally on your machine."
        icon={HardDrive}
      />

      <div className="mt-6 border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">

        <StorageRow
          label="Resume Storage"
          value="~/ATS_DESKTOP/"
        />

        <StorageRow
          label="Database"
          value="~/ATS_DESKTOP/atscheck.db"
        />

        <StorageRow
          label="Application Config"
          value="~/ATS_DESKTOP/config.json"
        />

      </div>

      <div className="mt-6 border-[3px] border-black bg-[#dcecff] p-5 shadow-[5px_5px_0_#111]">

        <div className="flex gap-3">

          <HardDrive
            className="shrink-0"
            size={22}
            strokeWidth={3}
          />

          <div>

            <h3 className="font-black">
              Local-first storage
            </h3>

            <p className="mt-1 text-sm font-semibold leading-5 text-gray-700">
              Resume files, scan history, resume versions,
              and application data remain on this computer.
            </p>

          </div>

        </div>

      </div>

    </section>
  );
}

// ============================================================
// Privacy
// ============================================================

function PrivacySettings() {
  return (
    <section>

      <SettingsHeader
        eyebrow="Privacy"
        title="Your data stays yours."
        description="Understand exactly where your resume data goes."
        icon={ShieldCheck}
      />

      <div className="mt-6 border-[3px] border-black bg-[#b8ff5a] p-7 shadow-[7px_7px_0_#111]">

        <div className="flex gap-4">

          <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-white">

            <Lock
              size={24}
              strokeWidth={3}
            />

          </div>

          <div>

            <h2 className="text-2xl font-black">
              Local by default.
            </h2>

            <p className="mt-2 max-w-2xl font-semibold leading-6">
              ATSCheck does not need a cloud backend to store
              your resumes or career data.
            </p>

          </div>

        </div>

      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">

        <PrivacyCard
          title="Resume files"
          description="Stored locally on your machine."
        />

        <PrivacyCard
          title="Scan history"
          description="Stored in the local ATSCheck database."
        />

        <PrivacyCard
          title="Cloud LLM requests"
          description="Sent directly from ATSCheck to the provider you selected."
        />

        <PrivacyCard
          title="Ollama"
          description="Models run entirely locally without a cloud API."
        />

      </div>

    </section>
  );
}

// ============================================================
// Application
// ============================================================

function ApplicationSettings() {
  return (
    <section>

      <SettingsHeader
        eyebrow="Application"
        title="ATSCheck Desktop"
        description="Application information and runtime status."
        icon={Laptop}
      />

      <div className="mt-6 border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">

        <InfoRow
          label="Version"
          value="0.1.0"
        />

        <InfoRow
          label="Runtime"
          value="Desktop / Local"
        />

        <InfoRow
          label="Database"
          value="SQLite"
        />

        <InfoRow
          label="Backend"
          value="FastAPI"
        />

        <InfoRow
          label="Frontend"
          value="React"
        />

      </div>

      <div className="mt-6 flex items-center gap-3 border-[3px] border-black bg-[#b8ff5a] p-5 shadow-[5px_5px_0_#111]">

        <Check
          size={22}
          strokeWidth={4}
        />

        <div>

          <p className="font-black">
            Local mode active
          </p>

          <p className="text-sm font-semibold">
            ATSCheck is running as a local desktop application.
          </p>

        </div>

      </div>

    </section>
  );
}

// ============================================================
// Storage Row
// ============================================================

function StorageRow({
  label,
  value,
}) {
  return (
    <div className="flex flex-col gap-2 border-b-[2px] border-black p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">

      <span className="font-black">
        {label}
      </span>

      <code className="w-fit border-[2px] border-black bg-[#f5f1e8] px-3 py-2 text-xs font-bold">
        {value}
      </code>

    </div>
  );
}

// ============================================================
// Privacy Card
// ============================================================

function PrivacyCard({
  title,
  description,
}) {
  return (
    <div className="border-[3px] border-black bg-white p-5 shadow-[4px_4px_0_#111]">

      <div className="flex gap-3">

        <Check
          className="mt-0.5 shrink-0"
          size={19}
          strokeWidth={4}
        />

        <div>

          <h3 className="font-black">
            {title}
          </h3>

          <p className="mt-1 text-sm font-semibold leading-5 text-gray-600">
            {description}
          </p>

        </div>

      </div>

    </div>
  );
}

// ============================================================
// Info Row
// ============================================================

function InfoRow({
  label,
  value,
}) {
  return (
    <div className="flex items-center justify-between border-b-[2px] border-black p-5 last:border-b-0">

      <span className="font-black">
        {label}
      </span>

      <span className="border-[2px] border-black bg-[#f5f1e8] px-3 py-1 font-mono text-sm font-bold">
        {value}
      </span>

    </div>
  );
}

export default Settings;