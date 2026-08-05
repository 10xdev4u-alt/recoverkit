// RecoverKit commit conventions (SPEC §10):
// Conventional Commits, tiny, imperative, subject ≤ 6 words.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  plugins: [
    {
      rules: {
        'subject-max-words': (parsed, _when, value) => {
          const count = parsed.subject
            ? parsed.subject.trim().split(/\s+/).length
            : 0;
          if (count <= value) return [true];
          return [false, `subject must be at most ${value} words (got ${count})`];
        },
      },
    },
  ],
  rules: {
    'subject-max-length': [2, 'always', 60],
    'subject-max-words': [2, 'always', 6],
  },
};
