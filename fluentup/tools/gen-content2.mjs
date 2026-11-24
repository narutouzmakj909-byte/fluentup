// Listening, writing and branching conversations (original, unverified). Run: node tools/gen-content2.mjs
import { writeFileSync } from 'node:fs'; import { validateConversation } from '../src/core/lessons.js';
const meta = { status: 'unverified', source: 'original, authored for FluentUp' };
const M = (prompt, options, answer, explain) => ({ type: 'mcq', prompt, options, answer, explain }), F = (prompt, answer, accept, explain) => ({ type: 'fill', prompt, answer, accept, explain });
const L = [
['l5','Asking the time','A1',['Excuse me, what time is it?','It is half past two.','Thank you. When does the shop close?','It closes at six.'],[M('What time is it?',['Half past two','Half past three','Six o\'clock'],0,'"half past two"'),M('When does the shop close?',['At two','At six','At nine'],1,'It closes at six.'),F('The first speaker says "Thank you" and then asks about the...','shop',['store'],'They ask when the shop closes.')]],
['l6','At the supermarket','A1',['Do you have any apples?','Yes, they are over there, next to the bananas.','How much are they?','One pound a kilo.'],[M('Where are the apples?',['Next to the bananas','Next to the milk','By the door'],0,'Next to the bananas.'),F('How much are the apples per kilo (in pounds)?','one',['1'],'One pound a kilo.'),M('What does the customer want to buy?',['Apples','Bread','Rice'],0,'The customer asks about apples.')]],
['l7','Weekend plans','A2',['What are you doing this weekend?','I am visiting my grandmother on Saturday. She lives near the sea.','That sounds nice. And on Sunday?','I will stay at home and rest because I have exams next week.'],[M('Who is the speaker visiting?',['A friend','Their grandmother','A teacher'],1,'Their grandmother.'),M('Why will the speaker rest on Sunday?',['They are ill','They have exams next week','They are travelling'],1,'"because I have exams next week"'),F('Where does the grandmother live? Near the...','sea',['coast','ocean'],'"near the sea"')]],
['l8','Lost luggage','B1',['Good afternoon. My suitcase did not arrive on the flight from Nairobi.','I am sorry to hear that. Could you describe it, please?','It is large and black, with a red ribbon on the handle.','We will trace it and deliver it to your hotel within twenty-four hours.'],[M('What is the problem?',['A missed flight','A missing suitcase','A wrong ticket'],1,'The suitcase did not arrive.'),F('What colour is the ribbon?','red',[],'A red ribbon on the handle.'),M('When will it be delivered?',['Within twenty-four hours','Next week','Today at noon'],0,'Within twenty-four hours.')]],
['l9','A team update','B1',['Before we finish, I would like to update everyone on the project.','We have completed the first stage, but the testing is two days behind schedule.','Do you need more people to help?','Not yet. If it slips any further, I will let you know.'],[M('What is behind schedule?',['The design','The testing','The budget'],1,'Testing is two days behind.'),M('Has the first stage been completed?',['Yes','No','Only half'],0,'"completed the first stage"'),F('How many days behind is it?','two',['2'],'Two days behind schedule.')]],
['l10','A radio interview about housing','B2',['Rents in the capital have risen by almost fifteen per cent in two years, according to a new report.','The authors say the main cause is a shortage of new homes rather than rising demand.','They are calling on the government to ease planning rules so that more affordable housing can be built quickly.'],[M('By how much have rents risen?',['About 5%','Almost 15%','Over 50%'],1,'"almost fifteen per cent"'),M('What do the authors say is the main cause?',['A shortage of new homes','Rising demand','Higher wages'],0,'Shortage of new homes.'),M('What do they ask the government to do?',['Ease planning rules','Raise taxes','Ban rent'],0,'"ease planning rules"')]],
['l11','A lecture on memory','C1',['Memory is not a recording but a reconstruction; each time we recall an event, we rebuild it, and in doing so may subtly alter it.','This explains why eyewitness testimony, though delivered with great confidence, can be unreliable.','Confidence, in other words, is a poor guide to accuracy.'],[M('What does the lecturer say memory is?',['A recording','A reconstruction','A photograph'],1,'"a reconstruction"'),M('What can be unreliable?',['Eyewitness testimony','Written records','Maps'],0,'Eyewitness testimony.'),M('What is a poor guide to accuracy?',['Confidence','Time','Age'],0,'"Confidence ... is a poor guide to accuracy."')]],
['l12','A debate on translation','C2',['It is often said that translation is betrayal, yet that view presupposes that meaning resides entirely in the words.','In practice, a faithful translator must sometimes depart from the letter of the text in order to preserve its spirit.','The real failure is not liberty but indifference to the reader.'],[M('What does the first view assume?',['Meaning is entirely in the words','Translation is easy','Readers do not matter'],0,'It "presupposes that meaning resides entirely in the words".'),M('When may a translator depart from the letter?',['To preserve the spirit of the text','To shorten it','To change the author\'s opinion'],0,'To preserve its spirit.'),M('What is the "real failure"?',['Indifference to the reader','Using many words','Literal translation'],0,'"indifference to the reader"')]],
];
const listening = L.map(([id, title, level, sentences, questions]) => ({ id, title, level, ...meta, audio: null, sentences, questions }));
const W = [
['w-sent2','Describe your home','sentence','A1','Write 3 or 4 sentences about your home. Say where it is and what rooms it has.',10,60,false,[],'I live in a small house in Mogadishu. It has three rooms and a kitchen.'],
['w-par2','A good friend','paragraph','A2','Write a paragraph about a good friend. Say who they are, what they like, and why you like them. Use because.',35,130,false,['because'],'My friend Hodan is kind and funny. She likes music, and she cooks very well. I like her because she always helps me.'],
['w-opinion1','Is social media good for young people?','paragraph','B1','Write a paragraph giving your opinion. Give two reasons and use however.',60,160,false,['however'],'In my opinion, social media is useful because it helps young people stay in touch. However, it can waste time.'],
['w-mail2','Reply to a meeting invitation','email','B1','Write a formal email accepting a meeting on Thursday at 10 a.m. Start with Dear and end with Regards. Ask if you should bring any documents.',40,140,true,['dear','regards','thursday'],'Dear Ms Ali, Thank you for the invitation. I am happy to confirm the meeting on Thursday at 10 a.m. Should I bring any documents? Regards, Omar'],
['w-complaint','A complaint letter','email','B2','Write a formal email to complain about a late delivery. State the problem, say what you expect, and set a deadline. Start with Dear and end with Yours sincerely.',80,220,true,['dear','sincerely'],'Dear Sir or Madam, I am writing to complain about my order, which arrived two weeks late. I would like a refund by Friday. Yours sincerely, A. Hassan'],
['w-essay1','Should cities ban cars from centres?','essay','B2','Write an essay of at least 150 words. Introduce the topic, give arguments for and against, and conclude. Use linking words such as moreover and in conclusion.',150,350,true,['moreover','conclusion'],'Many cities are considering banning cars from their centres. Moreover, ... In conclusion, ...'],
['w-report1','A short progress report','report','C1','Write a short professional report (at least 120 words) on a project that is behind schedule. Include the cause, the impact and two recommendations.',120,300,true,['recommend'],'This report summarises the status of the project... The delay is due to... We recommend...'],
['w-cover','A cover letter','email','C1','Write a cover letter for a marketing assistant role. Explain your relevant experience and why you want the job. Start with Dear and end with Yours faithfully or Regards.',120,320,true,['dear','experience'],'Dear Hiring Manager, I am writing to apply for the position of Marketing Assistant. ...'],
['w-essay2','Language and identity','essay','C2','Write a reflective essay (at least 200 words) on whether language shapes the way we think. Take a clear position, anticipate a counter-argument and respond to it.',200,450,true,['although','nevertheless'],'Although the strong version of linguistic relativity has been disputed... Nevertheless...'],
];
const writing = W.map(([id, title, kind, level, prompt, minWords, maxWords, formal, required, model]) => ({ id, title, kind, level, prompt, minWords, maxWords, formal, required, model }));
// Branching conversations with different paths; the user's choice changes what the other person says next.
const B = [
{ id: 'c-refund', title: 'Returning a faulty phone', level: 'B2', context: 'You bought a phone two weeks ago and the screen is faulty. You are in the shop.', start: 'a', nodes: {
 a: { speaker: 'Assistant', say: 'Good afternoon. How can I help?', choices: [
  { text: "Hello. I bought this phone two weeks ago and the screen has stopped working. I'd like a refund, please.", score: 2, feedback: 'Clear problem and clear request.', next: 'b1' },
  { text: 'This phone is rubbish!', score: 0, feedback: 'Complaining without details makes it harder to get help.', next: 'b2' },
  { text: "I think there's a problem with this phone. Could you take a look?", score: 1, feedback: 'Polite, but state what you want.', next: 'b3' }] },
 b1: { speaker: 'Assistant', say: 'I am sorry about that. Do you have the receipt?', choices: [
  { text: "Yes, here it is. It's dated the ninth.", score: 2, feedback: 'Efficient.', next: 'c1' },
  { text: "I've lost it, but I paid by card. Could you check the transaction?", score: 2, feedback: 'Good problem-solving.', next: 'c2' },
  { text: 'No. Why do you need it?', score: 0, feedback: 'Sounds defensive. Explain your situation.', next: 'c2' }] },
 b2: { speaker: 'Assistant', say: 'I understand you are upset. Could you tell me what exactly is wrong?', choices: [
  { text: "I'm sorry. The screen went black after a week and won't turn on.", score: 2, feedback: 'Recovering politely works well.', next: 'b1' },
  { text: 'Just give me my money back.', score: 0, feedback: 'Demanding without details rarely helps.', next: 'c2' }] },
 b3: { speaker: 'Assistant', say: 'Of course. What seems to be the problem?', choices: [
  { text: 'The screen has stopped working, so I would like a refund or a replacement.', score: 2, feedback: 'Gives options.', next: 'b1' },
  { text: "It doesn't work.", score: 1, feedback: 'Add details.', next: 'b1' }] },
 c1: { speaker: 'Assistant', say: 'Thank you. I can offer a full refund or a replacement. Which would you prefer?', choices: [
  { text: "A replacement, please, if you have one in stock.", score: 2, feedback: 'Clear preference with a condition.', next: 'end' },
  { text: "I'd prefer a refund, thank you.", score: 2, feedback: 'Clear and polite.', next: 'end' },
  { text: 'Whatever.', score: 0, feedback: 'Too dismissive.', next: 'end' }] },
 c2: { speaker: 'Assistant', say: 'Without a receipt I would need a manager to approve it. It may take ten minutes.', choices: [
  { text: "That's fine, I'll wait. Thank you for your help.", score: 2, feedback: 'Patient and polite.', next: 'end' },
  { text: 'This is ridiculous. I have no time.', score: 0, feedback: 'Frustration rarely speeds things up.', next: 'end' },
  { text: 'Could you call me when the manager has decided? I can leave my number.', score: 2, feedback: 'Practical alternative.', next: 'end' }] },
 end: { end: true, speaker: 'Assistant', say: 'Thank you for your patience. Is there anything else I can do for you?' } } },
{ id: 'c-roommate', title: 'Sharing a flat: a disagreement', level: 'B1', context: 'Your flatmate keeps leaving dirty dishes in the sink. You want to talk about it.', start: 'a', nodes: {
 a: { speaker: 'Flatmate', say: 'Hey, you wanted to talk?', choices: [
  { text: "Yes. I'd like to talk about the dishes. Is now a good time?", score: 2, feedback: 'Checking the time is considerate.', next: 'b1' },
  { text: 'You never clean up!', score: 0, feedback: '"Never" sounds like an attack.', next: 'b2' },
  { text: 'Nothing, forget it.', score: 0, feedback: 'Avoiding the issue will not solve it.', next: 'b3' }] },
 b1: { speaker: 'Flatmate', say: 'Sure. What about them?', choices: [
  { text: "There are often dirty dishes in the sink, and it's becoming a problem for me.", score: 2, feedback: 'Describes the situation using "I" language.', next: 'c' },
  { text: "You're so lazy.", score: 0, feedback: 'Personal insults make people defensive.', next: 'b2' }] },
 b2: { speaker: 'Flatmate', say: "That's not fair. I've been very busy lately.", choices: [
  { text: "I understand you're busy. Could we agree on a simple rota?", score: 2, feedback: 'Acknowledges the other view, then proposes a solution.', next: 'c' },
  { text: "I don't care. Clean them now.", score: 0, feedback: 'Orders create conflict.', next: 'end' }] },
 b3: { speaker: 'Flatmate', say: 'Are you sure? You seem annoyed.', choices: [
  { text: "Well, actually, yes. It's about the dishes.", score: 2, feedback: 'Being honest is better.', next: 'b1' },
  { text: "I'm fine.", score: 0, feedback: 'The problem stays unsolved.', next: 'end' }] },
 c: { speaker: 'Flatmate', say: "OK, you're right. What do you suggest?", choices: [
  { text: 'How about we each wash our own dishes the same evening?', score: 2, feedback: 'A clear, fair proposal.', next: 'end' },
  { text: 'You do all of them from now on.', score: 1, feedback: 'Not very fair; aim for compromise.', next: 'end' }] },
 end: { end: true, speaker: 'Flatmate', say: "Alright. Let's try that and see how it goes." } } },
];
for (const c of B) { Object.assign(c, meta, { somali: null }); const e = validateConversation(c); if (e.length) throw new Error(c.id + ': ' + e.join(',')); }
const w = (f, d) => writeFileSync(new URL('../src/data/' + f, import.meta.url), JSON.stringify(d));
w('listening2.json', listening); w('writing2.json', writing); w('conversations3.json', B); console.log(listening.length, writing.length, B.length);
