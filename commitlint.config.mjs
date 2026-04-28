/** @type {import('@commitlint/types').UserConfig} */
const Configuration = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: "conventional-changelog-atom",
  formatter: "@commitlint/format",

  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    "scope-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 150],
  },

  ignores: [(commit) => commit === ""],
  defaultIgnores: true,
  helpUrl: "https://github.com/conventional-changelog/commitlint/#what-is-commitlint",
};

export default Configuration;
