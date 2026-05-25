import "server-only";

export type MeshyJobResult = {
  jobId: string;
  previewUrl: string | null;
  status: "pending" | "completed" | "failed";
};

const MESHY_API_BASE = "https://api.meshy.ai/openapi/v2";

export async function createMeshyTextTo3DJob(
  prompt: string
): Promise<MeshyJobResult> {
  const apiKey = process.env.MESHY_API_KEY;

  if (!apiKey) {
    const mockId = `mock_${Date.now()}`;
    return {
      jobId: mockId,
      previewUrl: null,
      status: "pending",
    };
  }

  const response = await fetch(`${MESHY_API_BASE}/text-to-3d`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "preview",
      prompt,
      art_style: "realistic",
      ai_model: "meshy-4",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Meshy API error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as { result?: string; id?: string };
  const jobId = data.result ?? data.id ?? "";

  return {
    jobId,
    previewUrl: null,
    status: "pending",
  };
}

export async function pollMeshyJob(jobId: string): Promise<MeshyJobResult> {
  const apiKey = process.env.MESHY_API_KEY;

  if (!apiKey || jobId.startsWith("mock_")) {
    return {
      jobId,
      previewUrl: null,
      status: "pending",
    };
  }

  const response = await fetch(`${MESHY_API_BASE}/text-to-3d/${jobId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return { jobId, previewUrl: null, status: "failed" };
  }

  const data = (await response.json()) as {
    status?: string;
    model_urls?: { glb?: string; obj?: string };
    thumbnail_url?: string;
  };

  const status =
    data.status === "SUCCEEDED"
      ? "completed"
      : data.status === "FAILED"
        ? "failed"
        : "pending";

  return {
    jobId,
    previewUrl:
      data.thumbnail_url ??
      data.model_urls?.glb ??
      data.model_urls?.obj ??
      null,
    status,
  };
}
