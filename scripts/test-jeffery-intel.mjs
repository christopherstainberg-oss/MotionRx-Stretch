import { analyzeJefferyIntelligence, decideJefferyFlow } from '../src/lib/jeffery-intelligence.ts';
import { jefferyLocalReply } from '../src/lib/jeffery.ts';

const empty = analyzeJefferyIntelligence([]);
console.log('empty', empty.richness, empty.priorPrompt.heading);
const seed = decideJefferyFlow([]);
console.log('seed', seed.type);

const msgs = [
  { id: '1', role: 'jeffery', content: 'Hi\n\n**Question for you:** What bothers you?', createdAt: new Date().toISOString() },
  { id: '2', role: 'user', content: 'My left lower back hurts when sitting more than 20 minutes. Pain is 5/10. After walking I feel better.', createdAt: new Date().toISOString() },
];
const intel = analyzeJefferyIntelligence(msgs, { preferredName: 'Chris' });
console.log('grade', intel.intelligenceGrade, 'pain', intel.painNow, 'agg', intel.story.aggravators);
console.log('missing', intel.missingThemes.slice(0,4).join(','));
console.log('nextQ', intel.adaptiveQuestions[0]?.label);

const reply = jefferyLocalReply(msgs[1].content, { routines: [], sessions: [], journal: [], preferredName: 'Chris', freeText: msgs[1].content });
console.log('has live read', reply.message.content.includes('Live clinical read') || reply.message.content.includes('Conversation intel'));
console.log('has question', /Question for you/i.test(reply.message.content));
