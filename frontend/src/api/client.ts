import axios from "axios";
import type { AnalyzeResponse, ComposeResponse, ConfigResponse, ResumeSections } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE_URL });

export async function getConfig(): Promise<ConfigResponse> {
  const { data } = await client.get<ConfigResponse>("/api/config");
  return data;
}

export async function extractPdfText(file: File): Promise<{ filename: string; text: string; pageCount: number }> {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await client.post("/api/extract/pdf", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function analyzeResumeAgainstJD(
  resumeText: string,
  jdText: string,
  useLlmGapCheck = false
): Promise<AnalyzeResponse> {
  const { data } = await client.post<AnalyzeResponse>("/api/analyze", {
    resumeText,
    jdText,
    useLlmGapCheck,
  });
  return data;
}

export async function composeResume(sections: ResumeSections, jdText: string): Promise<ComposeResponse> {
  const { data } = await client.post<ComposeResponse>("/api/compose", { sections, jdText });
  return data;
}

export async function draftBullet(
  term: string,
  jdContext: string,
  userDetail: string
): Promise<{ bullet: string; usedLLM: boolean }> {
  const { data } = await client.post("/api/draft-bullet", { term, jdContext, userDetail });
  return data;
}

export default client;
