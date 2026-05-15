export interface PrivacyConfig {
  maskInputs: boolean;
  blockSelectors: string[];
  piiPatterns: RegExp[];
  consentRequired: boolean;
  /** Span attribute keys that are always stripped before export. */
  scrubAttributes: string[];
}

export interface SamplingConfig {
  rate: number;
  /** Buffer all spans per session; if an error span is recorded, flush 100%. Otherwise apply rate. */
  errorAware: boolean;
}

export interface InstrumentConfig {
  routing: boolean;
  clicks: boolean;
  forms: boolean;
  fetch: boolean;
  vitals: boolean;
  errors: boolean;
}

export interface BlindspotConfig {
  endpoint: string;
  serviceName: string;
  privacy?: Partial<PrivacyConfig>;
  sampling?: Partial<SamplingConfig>;
  instrument?: Partial<InstrumentConfig>;
}

export interface ResolvedConfig {
  endpoint: string;
  serviceName: string;
  privacy: PrivacyConfig;
  sampling: SamplingConfig;
  instrument: InstrumentConfig;
}

export function resolveConfig(config: BlindspotConfig): ResolvedConfig {
  return {
    endpoint: config.endpoint,
    serviceName: config.serviceName,
    privacy: {
      maskInputs: config.privacy?.maskInputs ?? true,
      blockSelectors: config.privacy?.blockSelectors ?? [],
      piiPatterns: config.privacy?.piiPatterns ?? [],
      consentRequired: config.privacy?.consentRequired ?? false,
      scrubAttributes: config.privacy?.scrubAttributes ?? [],
    },
    sampling: {
      rate: config.sampling?.rate ?? 1.0,
      errorAware: config.sampling?.errorAware ?? false,
    },
    instrument: {
      routing: config.instrument?.routing ?? true,
      clicks: config.instrument?.clicks ?? true,
      forms: config.instrument?.forms ?? true,
      fetch: config.instrument?.fetch ?? true,
      vitals: config.instrument?.vitals ?? true,
      errors: config.instrument?.errors ?? true,
    },
  };
}
