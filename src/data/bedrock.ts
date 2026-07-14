/**
 * Curated AWS Bedrock model catalog — reference for which foundation models a
 * PLCY customer can reach, the plan tier that unlocks each, and how it's
 * available: customer-enabled (BYOK, tokens on their AWS bill) and/or
 * PLCY-offered (managed credits). Feeds the Bedrock entitlement on the pricing
 * page. Model rosters and regional availability shift often — validate against
 * current AWS docs before committing specifics to a contract.
 */
export type Modality = 'Text' | 'Multimodal' | 'Embeddings' | 'Image' | 'Speech'

export interface BedrockModel {
  id: string
  name: string
  provider: string
  modality: Modality
  strengths: string
  /** Plan name that unlocks this model in the catalog. */
  minTier: string
  /** Customer can enable it in their own AWS account (BYOK). */
  byok: boolean
  /** PLCY offers it via managed credits. */
  managed: boolean
}

export const PROVIDER_TONE: Record<string, 'purple' | 'orange' | 'blue' | 'green' | 'red' | 'slate' | 'yellow'> = {
  Anthropic: 'purple',
  Amazon: 'orange',
  Meta: 'blue',
  Mistral: 'red',
  Cohere: 'green',
  AI21: 'yellow',
  DeepSeek: 'blue',
  'Stability AI': 'slate',
}

export const modalityTone: Record<Modality, 'blue' | 'purple' | 'green' | 'orange' | 'slate'> = {
  Text: 'blue',
  Multimodal: 'purple',
  Embeddings: 'green',
  Image: 'orange',
  Speech: 'slate',
}

export const bedrockModels: BedrockModel[] = [
  { id: 'bm_claude_opus', name: 'Claude Opus', provider: 'Anthropic', modality: 'Multimodal', strengths: 'Top-tier reasoning, safety, long context — high-stakes regulated workloads', minTier: 'Business', byok: true, managed: true },
  { id: 'bm_claude_sonnet', name: 'Claude Sonnet', provider: 'Anthropic', modality: 'Multimodal', strengths: 'Balanced reasoning vs cost; strong tool use — the everyday workhorse', minTier: 'Team', byok: true, managed: true },
  { id: 'bm_claude_haiku', name: 'Claude Haiku', provider: 'Anthropic', modality: 'Text', strengths: 'Fast and low-cost for high-volume classification & extraction', minTier: 'Builder', byok: true, managed: true },
  { id: 'bm_nova_pro', name: 'Amazon Nova Pro', provider: 'Amazon', modality: 'Multimodal', strengths: 'Cost-effective multimodal with deep AWS integration', minTier: 'Team', byok: true, managed: true },
  { id: 'bm_nova_lite', name: 'Amazon Nova Lite', provider: 'Amazon', modality: 'Multimodal', strengths: 'Very low cost, good for bulk multimodal tasks', minTier: 'Builder', byok: true, managed: true },
  { id: 'bm_nova_micro', name: 'Amazon Nova Micro', provider: 'Amazon', modality: 'Text', strengths: 'Cheapest text tier for simple, high-throughput jobs', minTier: 'Builder', byok: true, managed: true },
  { id: 'bm_llama', name: 'Llama (open weights)', provider: 'Meta', modality: 'Text', strengths: 'Open, customizable, portable — path to on-prem alignment', minTier: 'Team', byok: true, managed: true },
  { id: 'bm_mistral', name: 'Mistral Large', provider: 'Mistral', modality: 'Text', strengths: 'Efficient, EU-origin — data-residency-sensitive customers', minTier: 'Team', byok: true, managed: true },
  { id: 'bm_command', name: 'Command R+', provider: 'Cohere', modality: 'Text', strengths: 'Enterprise RAG and grounded generation', minTier: 'Team', byok: true, managed: false },
  { id: 'bm_embed', name: 'Embed / Rerank', provider: 'Cohere', modality: 'Embeddings', strengths: 'Best-in-class retrieval & reranking for knowledge bases', minTier: 'Team', byok: true, managed: true },
  { id: 'bm_jamba', name: 'Jamba', provider: 'AI21', modality: 'Text', strengths: 'Very long context windows for large-document workloads', minTier: 'Business', byok: true, managed: false },
  { id: 'bm_deepseek', name: 'DeepSeek-R1', provider: 'DeepSeek', modality: 'Text', strengths: 'Open reasoning model; cost-efficient chain-of-thought', minTier: 'Team', byok: true, managed: false },
  { id: 'bm_sd3', name: 'Stable Diffusion 3', provider: 'Stability AI', modality: 'Image', strengths: 'Image generation for creative and marketing workflows', minTier: 'Business', byok: true, managed: false },
  { id: 'bm_nova_canvas', name: 'Nova Canvas / Sonic', provider: 'Amazon', modality: 'Image', strengths: 'Image (Canvas) and speech (Sonic) generation', minTier: 'Business', byok: true, managed: false },
]

export const bedrockProviders = [...new Set(bedrockModels.map((m) => m.provider))]
export const bedrockModalities: Modality[] = ['Text', 'Multimodal', 'Embeddings', 'Image', 'Speech']
