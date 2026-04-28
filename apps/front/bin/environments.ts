export interface EnvConfig {
  cloudFormantName: string
}

export const environments: Record<string, EnvConfig> = {
  dev: {
    cloudFormantName: 'dev-twy-am',
  },
  prod: {
    cloudFormantName: 'twy-am',
  },
}
