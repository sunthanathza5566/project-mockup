/**
 * AI provider interface — input ที่เข้ามาที่นี่ถูก redact แล้วเสมอ
 * Phase A: มีเฉพาะ offline deterministic provider · Phase B: Claude API (ANTHROPIC_API_KEY ใน env)
 * provider "ไม่มี" ฟังก์ชันให้คะแนน/อนุมัติ/เปลี่ยน state (กฎ 7.3 บังคับที่ระดับ interface)
 */
import type { Gap, PdcaFlags, PdcaStage, Requirement } from '../../types';

export interface EvidenceDigest { code: string; title: string; kind: string; pdca: PdcaStage; summary: string }
export interface MetricDigest { code: string; nameTh: string; period: number; value: number; unit: string }

export interface TagInput { title: string; text: string; requirements: Requirement[]; currentPdca: PdcaStage }
export interface TagOutput {
  summary: string;
  suggestions: { requirementId: string; confidence: number; reasons: string[] }[];
  pdcaStage: PdcaStage; pdcaReason: string;
}

export interface DraftInput { requirement: Requirement; language: 'th' | 'en'; evidence: EvidenceDigest[]; metrics: MetricDigest[] }
export interface DraftOutput { draft: string; missing: string[]; usedEvidence: string[] }

export interface ReviewInput {
  requirement: Requirement; narrative: string; pdca: PdcaFlags; evidence: EvidenceDigest[]; gaps: Gap[]; language: 'th' | 'en';
}
export interface ReviewOutput { unanswered: string[]; uncitedSentences: string[]; suggestions: string[] }

export interface AiProvider {
  id: string; model: string; promptVersion: string;
  tagEvidence(input: TagInput): Promise<TagOutput>;
  draftSar(input: DraftInput): Promise<DraftOutput>;
  reviewSar(input: ReviewInput): Promise<ReviewOutput>;
}
