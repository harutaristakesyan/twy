export interface EnvConfig {
  domain: string;
}

export const environments: Record<string, EnvConfig> = {
  dev: {
    domain: "dev.twy.am",
  },
  prod: {
    domain: "twy.am",
  },
};
