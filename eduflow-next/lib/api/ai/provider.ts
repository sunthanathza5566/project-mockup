/**
 * AI provider interface — input ที่เข้ามาที่นี่ถูก redact แล้วเสมอ
 * offline deterministic provider (ทำงานได้เสมอ) · Claude API ผ่าน Route Handler app/api/ai (ANTHROPIC_API_KEY ฝั่ง server) แล้ว fallback offline
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

// ─── AI-7: PLO/CLO verb checker ───
export interface VerbItem { id: string; code: string; kind: 'plo' | 'clo'; textTh: string; textEn: string; declaredLevel: number }
export interface VerbInput { items: VerbItem[] }
export interface VerbResult {
  id: string; code: string; kind: 'plo' | 'clo'; verbs: string[];
  /** ระดับ Bloom ที่จับได้จากคำกริยา (เรียง) */
  detectedLevels: number[]; declaredLevel: number;
  measurable: boolean;
  /** null = ตัดสินไม่ได้ (ไม่พบคำกริยา) */
  levelMatch: boolean | null;
  note: string; suggestions: string[];
}
export interface VerbOutput { results: VerbResult[] }

// ─── AI-9: assessor summary + interview questions ───
export type InterviewGroup = 'lecturer' | 'student' | 'alumni' | 'employer';
export type FiveW1H = 'What' | 'Why' | 'Who' | 'When' | 'Where' | 'How';
export interface SummaryReqInput {
  id: string; textTh: string; plainTh: string; narrative: string; pdca: PdcaFlags; selfScore?: number;
  evidence: EvidenceDigest[]; gaps: string[]; diagnosticQuestions: string[];
}
export interface SummaryInput { criterion: { no: number; nameTh: string; nameEn: string }; requirements: SummaryReqInput[] }
export interface SummaryOutput {
  summaries: { requirementId: string; summary: string; strengths: string[]; concerns: string[] }[];
  questions: { group: InterviewGroup; items: { w: FiveW1H; requirementId: string; question: string }[] }[];
}

// ─── AI-4: translator TH↔EN ───
export interface TranslateInput { text: string; from: 'th' | 'en'; to: 'th' | 'en'; glossary: { th: string; en: string }[] }
export interface TranslateOutput {
  translation: string;
  /** true = offline: แทนศัพท์ glossary เท่านั้น ผู้ใช้ต้องแปลต่อเอง */
  needsHumanTranslation?: boolean;
}

export interface AiProvider {
  id: string; model: string; promptVersion: string;
  tagEvidence(input: TagInput): Promise<TagOutput>;
  draftSar(input: DraftInput): Promise<DraftOutput>;
  reviewSar(input: ReviewInput): Promise<ReviewOutput>;
  checkVerbs(input: VerbInput): Promise<VerbOutput>;
  summarizeCriterion(input: SummaryInput): Promise<SummaryOutput>;
  translate(input: TranslateInput): Promise<TranslateOutput>;
}
