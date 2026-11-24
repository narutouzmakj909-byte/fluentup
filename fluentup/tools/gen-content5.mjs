// Fills CEFR gaps: A1/C2 conversations, A2/C2 professional, A1 reading + listening, A1/C2 library. Original, unverified, Somali null.
import { writeFileSync, readFileSync } from 'node:fs';
const meta = { status: 'unverified', source: 'original, authored for FluentUp', somali: null };
const mcq = (prompt, options, answer, explain) => ({ type: 'mcq', prompt, options, answer, explain });
const fill = (prompt, answer, explain) => ({ type: 'fill', prompt, answer, explain });
const order = (prompt, answer, explain) => ({ type: 'order', prompt, words: [...answer].reverse(), answer, explain });
const W = (f, d) => writeFileSync(new URL(`../src/data/${f}.json`, import.meta.url), JSON.stringify(d));
const R = f => JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8'));
const ch = (text, score, feedback, next) => ({ text, score, feedback, next });
const end = (speaker, say) => ({ speaker, say, end: true });

W('conversations4', [
 { id: 'c-x5-greet', title: 'Meeting a new classmate', level: 'A1', ...meta, context: 'It is your first day in a new class. A classmate says hello.', start: 'a', nodes: {
   a: { speaker: 'Sam', say: 'Hi! I am Sam. What is your name?', choices: [ch('Hi, Sam. I am Amina. Nice to meet you.', 2, 'Friendly and complete.', 'b'), ch('Amina.', 1, 'Correct, but add a greeting to sound friendly.', 'b'), ch('Why do you want to know?', 0, 'This sounds unfriendly when someone says hello.', 'b2')] },
   b: { speaker: 'Sam', say: 'Nice to meet you, Amina. Where are you from?', choices: [ch('I am from Somalia. And you?', 2, 'Good answer, and you asked a question back.', 'e1'), ch('Somalia.', 1, 'Correct. A full sentence is better.', 'e1'), ch('I do not know.', 0, 'Try to say where you are from.', 'e2')] },
   b2: { speaker: 'Sam', say: 'Oh, sorry. I only wanted to say hello.', choices: [ch('That is OK. I am Amina. Nice to meet you.', 2, 'A kind way to fix the moment.', 'b'), ch('Hmm.', 0, 'A short sound does not help the conversation.', 'e2')] },
   e1: end('Sam', 'Great! Let us sit together.'), e2: end('Sam', 'OK. See you later.') } },
 { id: 'c-x5-cafe', title: 'Ordering a drink at a café', level: 'A1', ...meta, context: 'You are at a café and want a tea.', start: 'a', nodes: {
   a: { speaker: 'Waiter', say: 'Hello. What would you like?', choices: [ch('Hello. A tea, please.', 2, 'Polite and clear.', 'b'), ch('Tea.', 1, 'Understood, but add "please".', 'b'), ch('Give me tea now.', 0, 'This is too direct and not polite.', 'b2')] },
   b: { speaker: 'Waiter', say: 'Hot or cold?', choices: [ch('Hot, please.', 2, 'Short and polite.', 'c'), ch('Hot.', 1, 'Fine. Add "please".', 'c'), ch('I like Tuesday.', 0, 'This does not answer the question.', 'e2')] },
   b2: { speaker: 'Waiter', say: 'Sorry? Could you ask again, please?', choices: [ch('Sorry. A tea, please.', 2, 'A good, polite repair.', 'b'), ch('No.', 0, 'This ends the conversation badly.', 'e2')] },
   c: { speaker: 'Waiter', say: 'That is two dollars.', choices: [ch('Here you are. Thank you.', 2, 'Natural when you pay.', 'e1'), ch('Okay.', 1, 'Acceptable, but add thanks.', 'e1'), ch('Too much!', 0, 'Rude when the price is fair.', 'e2')] },
   e1: end('Waiter', 'Thank you! Enjoy your tea.'), e2: end('Waiter', 'Okay. Have a nice day.') } },
 { id: 'c-x5-diplomacy', title: 'Disagreeing with a senior colleague', level: 'C2', ...meta, context: 'A senior director proposes cutting the training budget. You believe this is a mistake and need to say so without damaging the relationship.', start: 'a', nodes: {
   a: { speaker: 'Director', say: 'I think we should cut the training budget entirely this year. It is the easiest saving available.', choices: [ch('I appreciate the pressure on costs, and I wonder whether we might look at the longer-term picture before we decide.', 2, 'Acknowledges the concern, then reframes diplomatically.', 'b1'), ch('That would be a mistake.', 0, 'Blunt disagreement with a senior colleague closes the discussion.', 'b2'), ch('If that is what you think best, I will go along with it.', 1, 'Avoids conflict but gives up your point.', 'b3')] },
   b1: { speaker: 'Director', say: 'Go on. What are you worried about?', choices: [ch('Our attrition figures suggest that untrained staff leave sooner, so the saving may prove false economy. Might a reduced programme be a fair compromise?', 2, 'Evidence plus a constructive alternative.', 'e1'), ch('Everyone knows training matters.', 0, 'A vague appeal is easy to dismiss.', 'e2'), ch('I simply feel uneasy about it.', 1, 'Honest but lacks substance.', 'e2')] },
   b2: { speaker: 'Director', say: 'I beg your pardon? I would like to hear your reasoning, if you have any.', choices: [ch('That came across more sharply than I intended. My concern is that the savings may be short-lived, and I would like to explain why.', 2, 'A gracious recovery that keeps your argument alive.', 'b1'), ch('Well, it is obvious.', 0, 'Escalates the conflict.', 'e2')] },
   b3: { speaker: 'Director', say: 'Good. I am glad we are aligned.', choices: [ch('Actually, before we finalise, could I raise one reservation?', 2, 'Reopens the issue politely at the right moment.', 'b1'), ch('Of course. Nothing further.', 0, 'You have conceded without voicing a real concern.', 'e2')] },
   e1: end('Director', 'That is a fair point. Let us draft a reduced programme and review it next month.'), e2: end('Director', 'I will think about it, but my inclination stands.') } },
]);

W('professional4', [
 { id: 'p-x5-intro', track: 'professional', title: 'Introducing yourself at work', level: 'A2', ...meta,
   explanation: 'When you meet a new colleague, say your name, your job and your team: "Hello, I am Ali. I work in the finance team." Ask a simple question back: "What do you do?" Use "Nice to meet you" and shake hands or smile. Keep the language simple and clear.',
   examples: ['I work in…: I am part of a department', 'team: a group of people who work together', 'Nice to meet you: a polite phrase when you meet someone'],
   exercises: [mcq('Which sentence introduces your job?', ['I work in the finance team.', 'I am Tuesday.', 'Finance is a team.'], 0, '"I work in…" says where you work.'), mcq('What can you ask back?', ['What do you do?', 'Where is my coffee?', 'Why you are here?'], 0, 'It is a natural, polite question.'), fill('A polite phrase when you meet someone: "Nice to ... you." (one word)', 'meet', '"Nice to meet you".')] },
 { id: 'p-x5-email', track: 'professional', title: 'Short workplace emails', level: 'A2', ...meta,
   explanation: 'A short email has a greeting, one clear message and a closing. Start with "Dear Mr Hassan," or "Hi Fatima,". Write your request in one or two short sentences: "Could you send me the report, please?" End with "Thank you" and "Best wishes" or "Regards".',
   examples: ['Dear Mr/Ms…: a polite greeting for people you do not know well', 'attach: to add a file to an email', 'Regards: a polite way to end an email'],
   exercises: [mcq('Which is a polite request?', ['Send the report.', 'Could you send me the report, please?', 'Report now.'], 1, '"Could you… please?" is polite.'), mcq('Which is a good ending?', ['Whatever.', 'Thank you. Best wishes, Amina', 'Bye bye bye'], 1, 'It thanks the reader and closes politely.'), order('Put the words in order.', ['Could', 'you', 'send', 'me', 'the', 'file,', 'please?'], 'A polite request.')] },
 { id: 'p-x5-persuade', track: 'professional', title: 'Diplomatic and persuasive language', level: 'C2', ...meta,
   explanation: 'At the highest level, persuasion depends on tone as much as content. Hedging softens a claim ("It could be argued that…", "I wonder whether…"), concessions build trust ("While I take your point about cost,…"), and framing links your proposal to the listener\'s goals ("This would help us meet the target you set."). Avoid absolute words such as "obviously" and "everyone knows", which invite resistance.',
   examples: ['hedge: to make a statement less direct or certain', 'concession: admitting a point in the other person\'s view', 'frame: to present an idea from a particular angle'],
   exercises: [mcq('Which sentence is the most diplomatic?', ['Obviously, you are wrong.', 'While I take your point about cost, I wonder whether the long-term picture might favour another approach.', 'Everyone knows this plan fails.'], 1, 'It concedes, then hedges.'), mcq('Why avoid "everyone knows"?', ['It is too short', 'It invites resistance because it presumes agreement', 'It is formal'], 1, 'Absolute claims provoke pushback.'), fill('Admitting part of the other side\'s point is called a ... (one word)', 'concession', 'A concession builds trust.')] },
]);

W('reading4', [
 { id: 'r-x5-cafe', track: 'reading', title: 'At the café', level: 'A1', ...meta,
   explanation: 'Omar is at a café. He sits near the window. He orders a cup of tea and a small cake. The tea is hot. The cake is sweet. Omar reads a book and drinks his tea. He pays two dollars. Then he goes home.',
   examples: ['window: the glass part of a wall where you can see outside', 'order: to ask for food or drink in a café', 'sweet: tasting like sugar'],
   exercises: [mcq('Where does Omar sit?', ['Near the window', 'Near the door', 'At home'], 0, 'He sits near the window.'), mcq('What does he order?', ['Tea and a small cake', 'Coffee and bread', 'Water'], 0, 'He orders tea and a small cake.'), fill('He pays two... (one word)', 'dollars', 'He pays two dollars.')] },
 { id: 'r-x5-school', track: 'reading', title: 'My school', level: 'A1', ...meta,
   explanation: 'My name is Hana. I go to a big school. My school has twenty classrooms and one library. I study English, maths and science. My favourite teacher is Mr Yusuf. School starts at eight and finishes at two. I walk to school with my friend.',
   examples: ['library: a place with many books', 'favourite: the one you like best', 'finish: to end'],
   exercises: [mcq('How many classrooms are there?', ['Ten', 'Twenty', 'Two'], 1, 'The school has twenty classrooms.'), mcq('When does school finish?', ['At eight', 'At two', 'At twelve'], 1, 'School finishes at two.'), fill('Hana walks to school with her... (one word)', 'friend', 'She walks with her friend.')] },
]);

W('listening4', [
 { id: 'l-x5-food', title: 'Ordering lunch', level: 'A1', ...meta, audio: null,
   sentences: ['Hello. Can I have rice and chicken, please?', 'Yes. Anything to drink?', 'Water, please.', 'That is five dollars.', 'Here you are. Thank you.'],
   questions: [mcq('What does the customer order to eat?', ['Rice and chicken', 'Pasta', 'Soup'], 0, '"rice and chicken".'), mcq('What does the customer drink?', ['Tea', 'Water', 'Juice'], 1, 'The customer asks for water.'), fill('How many dollars is it? (a number word)', 'five', 'That is five dollars.')] },
 { id: 'l-x5-friend', title: 'Introducing a friend', level: 'A1', ...meta, audio: null,
   sentences: ['Mum, this is my friend Layla.', 'Hello, Layla. Nice to meet you.', 'Nice to meet you too.', 'Layla is in my class.', 'Please come in and sit down.'],
   questions: [mcq('Who is Layla?', ['A teacher', 'A friend', 'A neighbour'], 1, 'She is the speaker\'s friend.'), mcq('Where is Layla with the speaker?', ['In the same class', 'In the same street', 'At the same shop'], 0, 'Layla is in my class.'), fill('Mum says: "Please come in and sit ...". (one word)', 'down', 'sit down.')] },
]);

const D = [
['word','breakfast','A1','the first meal of the day','I eat breakfast at seven.','neutral','food'],['word','water','A1','a clear liquid that you drink','Can I have some water?','neutral','food'],['word','school','A1','a place where children learn','My school is near my house.','neutral','education'],['word','happy','A1','feeling good and pleased','She is happy today.','neutral','feelings'],['word','small','A1','not big','I have a small bag.','neutral','description'],['word','open','A1','not closed','The shop is open.','neutral','everyday'],['word','sister','A1','a girl or woman with the same parents as you','My sister is ten.','neutral','family'],['word','Monday','A1','the first working day of the week','I have class on Monday.','neutral','time'],
['phrase','Excuse me','A1','used to get someone\'s attention politely','Excuse me, where is the station?','neutral','conversation'],['phrase','Thank you very much','A1','a polite way to show you are very grateful','Thank you very much for your help.','neutral','conversation'],['phrase','I don\'t understand','A1','used when you cannot follow what someone says','Sorry, I don\'t understand.','neutral','conversation'],['phrase','What does this mean?','A1','a question to ask the meaning of a word','What does this word mean?','neutral','study'],['phrasal_verb','come in','A1','to enter a room or building','Please come in.','neutral','everyday'],['phrasal_verb','stand up','A1','to rise from sitting to standing','Please stand up.','neutral','everyday'],
['word','inexorable','C2','impossible to stop or prevent','The inexorable rise of prices worried families.','formal','general'],['word','obfuscate','C2','to make something unclear or hard to understand on purpose','The report seemed to obfuscate the real costs.','formal','general'],['word','sanguine','C2','optimistic, especially in a difficult situation','She remained sanguine about the outcome.','formal','general'],['word','recalcitrant','C2','stubbornly refusing to obey or cooperate','The recalcitrant board resisted every reform.','formal','work'],['idiom','a Pyrrhic victory','C2','a win that costs so much that it is almost not worth it','The settlement was a Pyrrhic victory for the company.','formal','general'],['idiom','to sit on the fence','C2','to avoid choosing a side in an argument','He prefers to sit on the fence in political debates.','neutral','discussion'],['phrase','By no stretch of the imagination','C2','used to say something is definitely not true','By no stretch of the imagination was it an easy decision.','formal','discussion'],['phrase','Notwithstanding','C2','despite; in spite of','Notwithstanding the delay, the project succeeded.','formal','work'],
];
const prior = ['seed', 'seed2', 'seed3', 'seed4'].flatMap(R), seen = new Set(prior.map(e => `${e.type}|${e.en.trim().toLowerCase()}`)); let n = 200;
const out = D.filter(([t, en]) => !seen.has(`${t}|${en.toLowerCase()}`)).map(([type, en, level, def, ex, register, context]) => ({ id: `h${n++}`, type, en, def, ex: [ex], level, ipa: null, status: 'unverified', source: 'original, authored for FluentUp', somali: null, register, context, category: context }));
W('seed5', out); console.log('seed5:', out.length, 'of', D.length);
