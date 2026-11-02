/** Textos que mudam entre as telas de professores e de alunos. */
export function roleLabels(role) {
  return role === 'professor'
    ? { singular: 'Professor', plural: 'Professores', article: 'o professor' }
    : { singular: 'Aluno', plural: 'Alunos', article: 'o aluno' };
}
