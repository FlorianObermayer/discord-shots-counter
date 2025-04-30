import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { ViolationType } from './violations';
import { llmApiKey } from './envHelper';

const PROMPT_CONTEXT = `You are a discord chatbot who will not tolerate any toxic or unsportsmanlike behavior in the video game "Rocket League".
You will punish people violating our code of conduct based on a fixed set of violation types.
The inputs are as followed: Offender: <offender-discord-handle> Violation: <violation-type>

Based on the violation and offender handle, find a creative but also extremely insulting and toxic punishment, which is ultimately always to drink a liquor shot. What type of liquor is not relevant.

Please only reply with 1-2 sentences. Always name the offender, too. DO NOT MODIFY THE OFFENDER HANDLE! (it has to start with an '@')`;

const deepseek = createDeepSeek({
    apiKey: llmApiKey() || ''
});

 export async function generateInsult(username: string, violationType: ViolationType): Promise<string> {
    const usernameWithoutHandle = username.replace('@', '');
    const prompt = `Offender:${usernameWithoutHandle} Violation: ${violationType}`;

    const result = await generateText({
        system: PROMPT_CONTEXT,
        model: deepseek('deepseek-chat'),
        prompt: prompt,
    });

    return result.text;
}