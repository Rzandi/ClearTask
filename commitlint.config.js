export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipe commit yang diizinkan
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'refactor', 'test', 'docs', 'style', 'perf', 'ci', 'revert'],
    ],
    // Panjang header maksimal 100 karakter
    'header-max-length': [2, 'always', 100],
    // Subject tidak boleh diakhiri titik
    'subject-full-stop': [2, 'never', '.'],
    // Subject tidak boleh kosong
    'subject-empty': [2, 'never'],
    // Type tidak boleh kosong
    'type-empty': [2, 'never'],
  },
};
