import { therapeuticCatalogStats, getTherapeuticQuestionByIndex, sampleTherapeuticQuestions, THERAPEUTIC_QUESTION_CAPACITY } from '../src/data/therapeutic-question-catalog.ts';
const s = therapeuticCatalogStats();
console.log(JSON.stringify(s, null, 2));
console.log('sample0', getTherapeuticQuestionByIndex(0).question.slice(0, 100));
console.log('sample999999', getTherapeuticQuestionByIndex(999999).id);
console.log('samples', sampleTherapeuticQuestions(3, 'x', {preferCurated:false}).map(q=>q.label));
console.log('capacity', THERAPEUTIC_QUESTION_CAPACITY);
console.log('vs51', (THERAPEUTIC_QUESTION_CAPACITY/51).toFixed(0)+'x');
