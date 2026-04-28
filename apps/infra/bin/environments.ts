export interface EnvConfig {
  primaryDomain: string;
  additionalDomains: string[];
  includeWww: boolean;
}

export const environments: Record<string, EnvConfig> = {
  dev: {
    primaryDomain: "dev.twy.am",
    additionalDomains: ["dev.twy.be"],
    includeWww: false,
  },
  prod: {
    primaryDomain: "twy.am",
    additionalDomains: ["twy.be"],
    includeWww: true,
  },
};
