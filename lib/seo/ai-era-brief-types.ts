/** Content brief for AI-era search (Google + AI Overviews). */

export type AiEraEdgeType =
  | "original_data"
  | "icp_specific"
  | "named_framework"
  | "deeper_subtopic";

export type AiEraContentBrief = {
  keyword: string;
  coreQuestion: string;
  aeoBlock: string;
  h2Map: string[];
  reader: string;
  edge: string;
  edgeType: AiEraEdgeType;
  cta: string;
  eeatSignal: string;
};

export type AiEraPrePublishCheck = {
  id: string;
  label: string;
  pass: boolean;
};

export type AiEraBriefResult = {
  brief: AiEraContentBrief;
  prePublishChecks: AiEraPrePublishCheck[];
  readyToPublish: boolean;
};

export type AiEraArticleResult = {
  brief: AiEraContentBrief;
  articleMarkdown: string;
  prePublishChecks: AiEraPrePublishCheck[];
  readyToPublish: boolean;
};
