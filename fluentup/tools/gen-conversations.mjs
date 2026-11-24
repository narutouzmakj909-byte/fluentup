// Compact authoring format -> src/data/conversations2.json (linear branching dialogues validated by validateConversation).
// Each turn: [say, [[text, score(0-2), feedback], ...]]. Content is original, status "unverified".
import { writeFileSync } from 'node:fs'; import { validateConversation } from '../src/core/lessons.js';
const S = [
['c-shop','Buying clothes','A2','You are in a clothes shop.','Shop assistant',[
 ['Hello! Can I help you?',[["Yes, I'm looking for a blue shirt.",2,'Clear and specific.'],["Shirt.",0,'Too short. Use a full sentence.'],["Just looking, thanks.",1,'Polite, but you asked for help later, so be clear.']]],
 ['What size do you need?',[["Medium, please.",2,'Short and polite.'],["I don't know.",0,'Try: "I think I am a medium."'],["Maybe medium?",1,'Understandable; sound more certain.']]],
 ['It is twenty-five dollars.',[["Can I try it on, please?",2,'Natural request in a shop.'],["Too expensive!",0,'Blunt. Ask about price politely instead.'],["OK, I'll take it.",2,'Clear decision.']]]],'Thanks for shopping with us!'],
['c-restaurant','At a restaurant','A2','You arrive at a restaurant with a friend.','Waiter',[
 ['Good evening. Do you have a reservation?',[["No, but a table for two, please.",2,'Clear and polite.'],["No.",1,'Add what you need.'],["Give us a table.",0,'Sounds rude. Use "Could we have...".']]],
 ['Here is the menu. Are you ready to order?',[["Yes, I'd like the chicken soup, please.",2,'"I\'d like" is polite.'],["Not yet, could we have a few more minutes?",2,'Good way to ask for time.'],["Chicken.",0,'Use a full sentence.']]],
 ['Would you like anything to drink?',[["Just water, please.",2,'Short and polite.'],["Water.",1,'Add "please".'],["What drinks?",0,'Ask: "What drinks do you have?"']]]],'Perfect. I will bring it soon.'],
['c-airport','Airport check-in','B1','You are at the airline check-in desk.','Agent',[
 ['Good morning. May I see your passport and ticket?',[["Of course, here you are.",2,'Natural and polite.'],["Take it.",0,'Rude. Say "Here you are."'],["Yes.",1,'Hand the documents over and say "Here you are."']]],
 ['Would you like a window or an aisle seat?',[["A window seat, please, if possible.",2,'Polite with "if possible".'],["I don't care.",0,'Sounds dismissive. Try "Either is fine."'],["Either is fine, thank you.",2,'Flexible and polite.']]],
 ['Do you have any bags to check in?',[["Yes, one suitcase.",2,'Direct and clear.'],["No, only hand luggage.",2,'Clear answer.'],["What?",0,'Say "Sorry, could you repeat that?"']]]],'Here is your boarding pass. Gate 12, boarding at ten.'],
['c-hotel','Hotel check-in','B1','You arrive at a hotel late in the evening.','Receptionist',[
 ['Welcome. Do you have a booking with us?',[["Yes, under the name Hassan.",2,'Gives the key information.'],["I booked online.",1,'Also give your name.'],["Yes, room.",0,'Incomplete. Give your name.']]],
 ['How many nights are you staying?',[["Three nights, until Friday.",2,'Precise.'],["Some nights.",0,'Too vague.'],["Three, I think.",1,'Check your booking first.']]],
 ['Breakfast is from seven to ten. Anything else?',[["Could you tell me the Wi-Fi password, please?",2,'Polite and useful.'],["Wi-Fi?",1,'Understandable; use a full question.'],["No, thank you. That's everything.",2,'Clear closing.']]]],'Enjoy your stay.'],
['c-directions','Asking for directions','A2','You are lost in a city centre.','Passer-by',[
 ['Hi, you look lost. Can I help?',[["Excuse me, how do I get to the station?",2,'Polite and clear.'],["Where station?",0,'Grammar is incomplete.'],["Yes, please. Where is the station?",2,'Good.']]],
 ['Go straight, then turn left at the bank.',[["Sorry, could you say that again, please?",2,'Great way to ask for repetition.'],["Straight, then left. Got it.",2,'Repeating confirms understanding.'],["I don't understand you.",0,'Blunt. Ask for repetition politely.']]],
 ['It is about ten minutes on foot.',[["Thank you so much for your help!",2,'Warm and polite.'],["OK.",1,'Add thanks.'],["Okay, bye.",1,'Thank them first.']]]],'You are welcome. Have a good day!'],
['c-phone','A phone call to book an appointment','B1','You call a clinic to make an appointment.','Receptionist',[
 ['Good morning, City Clinic. How can I help you?',[["Hello, I'd like to make an appointment, please.",2,'Clear purpose.'],["I want doctor.",0,'Use a full sentence.'],["Hi, can I book an appointment?",1,'Fine, slightly informal.']]],
 ['Is Tuesday at ten o\'clock OK for you?',[["Tuesday at ten is fine, thank you.",2,'Confirms politely.'],["Do you have anything later in the day?",2,'Polite alternative.'],["No.",0,'Offer a reason or alternative.']]],
 ['Could I have your name and phone number?',[["Yes, it's Amina Ali, and my number is 555-0142.",2,'Clear details.'],["Amina.",1,'Give your full name and number.'],["Why?",0,'Impolite. Just give the information.']]]],'Thank you. You are booked in.'],
['c-meeting','Joining a team meeting','B2','You join a weekly project meeting.','Manager',[
 ['Let\'s start. Can you give us a quick update on your tasks?',[["Sure. I finished the report and I'm now working on the slides.",2,'Concise and structured.'],["Everything is fine.",1,'Give specific details.'],["I did some things.",0,'Too vague for a meeting.']]],
 ['Is there anything blocking your progress?',[["I need access to the sales data. Could you help with that?",2,'Names the problem and asks for help.'],["No problems.",1,'Fine if true.'],["Yes, but it is your fault.",0,'Blaming is unprofessional.']]],
 ['The deadline moved to Friday. Is that realistic?',[["I think so, but I'll confirm by tomorrow.",2,'Honest and committed.'],["Impossible!",0,'Explain why and suggest options.'],["Yes, no problem.",1,'Good, but only if you are sure.']]]],'Great. Thanks, everyone. Let\'s finish here.'],
['c-service','Handling a customer complaint','B2','A customer is unhappy with a late delivery. You work in customer service.','Customer',[
 ['My order is two weeks late. This is unacceptable!',[["I'm very sorry about the delay. Let me check your order right away.",2,'Apology plus action.'],["It's not my problem.",0,'Never dismiss a customer.'],["Please calm down.",0,'Can make people angrier.']]],
 ['I want a refund.',[["Of course. I can refund you, or send a replacement. Which would you prefer?",2,'Offers choices.'],["We don't do refunds.",0,'Unhelpful without explanation.'],["I'll ask my manager and call you back today.",1,'Acceptable, but offer what you can do now.']]],
 ['How long will the refund take?',[["It usually takes three to five working days.",2,'Clear timeline.'],["I don't know.",0,'Find out or say you will.'],["Soon.",1,'Be specific.']]]],'Thank you for sorting this out.'],
['c-university','Talking to a professor','B2','You visit your professor during office hours about your essay.','Professor',[
 ['Come in. What can I do for you?',[["Thank you for seeing me. I'd like some feedback on my essay outline.",2,'Formal and purposeful.'],["Hey, check my essay.",0,'Too casual for a professor.'],["I have a question about the essay.",1,'Fine; say what question.']]],
 ['Your argument is clear, but you need stronger evidence.',[["That's helpful. Could you suggest where I might find better sources?",2,'Shows you can act on feedback.'],["I disagree. My evidence is fine.",0,'Be more open to feedback.'],["Okay.",1,'Ask a follow-up question.']]],
 ['Please send me a revised version by next week.',[["Certainly. I'll email it to you by Monday.",2,'Specific commitment.'],["Maybe.",0,'Commit or explain a problem.'],["I will try.",1,'Weak; give a date.']]]],'Good. I look forward to reading it.'],
['c-interview2','Interview: strengths and weaknesses','C1','You are in the second stage of a management job interview.','Interviewer',[
 ['What would you say is your greatest strength?',[["I'm good at turning complex problems into clear plans that teams can follow.",2,'Specific and relevant.'],["I'm perfect at everything.",0,'Unconvincing.'],["I work hard.",1,'Too generic; give an example.']]],
 ['And a weakness?',[["I used to take on too much myself, so I've learnt to delegate and set priorities.",2,'Honest, with improvement.'],["I have no weaknesses.",0,'Not credible.'],["I'm a perfectionist.",1,'A common cliché; be more original.']]],
 ['Where do you see yourself in five years?',[["I'd like to lead a larger team and keep developing strategically.",2,'Ambitious and relevant.'],["I don't plan that far.",1,'Show some direction.'],["In your job.",0,'Inappropriate.']]]],'Thank you. It was a pleasure to meet you.'],
['c-social','Meeting someone new at a party','A2','You meet a new person at a friend\'s party.','New friend',[
 ['Hi, I\'m Sara. I don\'t think we\'ve met.',[["Hi Sara, I'm Omar. Nice to meet you.",2,'Friendly and complete.'],["Hello.",1,'Add your name.'],["Who are you?",0,'Rude in this context.']]],
 ['How do you know the host?',[["We work together. How about you?",2,'Answers and asks back.'],["Work.",0,'Use a full sentence.'],["I don't know him well.",1,'Fine; continue the conversation.']]],
 ['What do you do in your free time?',[["I enjoy football and cooking. What about you?",2,'Shares and asks back.'],["Nothing.",0,'Conversation stopper.'],["Football.",1,'Add more detail.']]]],'It was great talking to you.'],
['c-bank','Opening a bank account','B1','You visit a bank to open an account.','Bank clerk',[
 ['Welcome. How can I help you today?',[["I'd like to open a current account, please.",2,'Clear and polite.'],["I want account.",0,'Incomplete.'],["Can you tell me about your accounts?",2,'Good way to start.']]],
 ['Do you have a form of identification?',[["Yes, I have my passport and a proof of address.",2,'Provides what is needed.'],["Maybe.",0,'Be clear.'],["Only my passport.",1,'Honest; ask what else is needed.']]],
 ['Would you like online banking as well?',[["Yes, please. How do I set it up?",2,'Positive with a follow-up.'],["No.",1,'Fine; add "thank you".'],["What is that?",1,'Ask more politely.']]]],'Your account will be ready in a few minutes.'],
['c-presentation','Questions after a presentation','C1','You have just finished a business presentation and the audience asks questions.','Audience member',[
 ['Thank you. Could you explain how you calculated those figures?',[["Certainly. We based them on last year's sales, adjusted for expected growth.",2,'Clear and professional.'],["It's in the slides.",0,'Dismissive.'],["Good question. I can walk you through the method.",2,'Welcoming.']]],
 ['What if the market declines?',[["That's a fair concern. We've prepared a conservative scenario as well.",2,'Acknowledges and answers.'],["It won't.",0,'Overconfident.'],["I'm not sure, I'll check and follow up.",1,'Honest; offer a time frame.']]],
 ['Thank you. That was very helpful.',[["Thank you for your questions. Please feel free to email me.",2,'Professional close.'],["OK.",0,'Too abrupt.'],["Thanks, goodbye.",1,'Add an invitation to follow up.']]]],'We will be in touch.'],
['c-doctor','At the doctor\'s','A2','You are visiting a doctor because you feel unwell.','Doctor',[
 ['Hello. What seems to be the problem?',[["I've had a sore throat and a headache since Monday.",2,'Describes symptoms and time.'],["I am bad.",0,'Too vague.'],["I don't feel well.",1,'Add symptoms.']]],
 ['Do you have a temperature?',[["Yes, it was thirty-eight degrees this morning.",2,'Specific.'],["Don't know.",0,'Say "I am not sure; I did not check."'],["I think so.",1,'Give details if you can.']]],
 ['I will give you a prescription. Take one tablet twice a day.',[["Thank you. Should I take it with food?",2,'Good follow-up.'],["Okay.",1,'Ask if unsure.'],["What?",0,'Say "Sorry, could you repeat that?"']]]],'Rest well and drink plenty of water.'],
];
const out = S.map(([id,title,level,context,speaker,turns,endSay]) => {
  const nodes = {}; turns.forEach(([say,ch],i) => { nodes['n'+(i+1)] = { speaker, say, choices: ch.map(([text,score,feedback]) => ({ text, score, feedback, next: i+1 < turns.length ? 'n'+(i+2) : 'end' })) }; });
  nodes.end = { end: true, speaker, say: endSay };
  return { id, title, level, context, status: 'unverified', source: 'original, authored for FluentUp', somali: null, start: 'n1', nodes };
});
for (const c of out) { const e = validateConversation(c); if (e.length) throw new Error(c.id + ': ' + e.join(',')); }
writeFileSync(new URL('../src/data/conversations2.json', import.meta.url), JSON.stringify(out));
console.log('wrote', out.length, 'conversations');
